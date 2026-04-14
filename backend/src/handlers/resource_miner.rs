use crate::models::ocel::{OCEL, OCELUtils};
use crate::traits::import_export::ImportableFromPath;
use axum::{Json, extract::Path, http::StatusCode, response::IntoResponse};
use rustc_hash::FxHashSet;
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};
use std::panic::{AssertUnwindSafe, catch_unwind};

#[derive(Debug, Serialize)]
pub struct ObjectNotResourceArc {
    pub source_type: String,
    pub target_type: String,
}

#[derive(Debug, Serialize)]
pub struct ResourceMinerResponse {
    pub object_type_not_resource: Vec<String>,
    pub object_resource: Vec<String>,
    pub event_types_without_object_resource: Vec<String>,
    pub object_not_resource_arcs: Vec<ObjectNotResourceArc>,
    pub special_activity: Vec<String>,
}

// Structure for the found non-diverging object type combinations
#[derive(Debug, Serialize)]
pub struct NonDivergingCombination {
    pub object_types: Vec<String>,
    pub considered_events: usize,
    pub joint_signatures: usize,
}

// Response for a special activity: contains the activity name and the non-diverging object type combinations found for it
#[derive(Debug, Serialize)]
pub struct SpecialActivityCombinationResponse {
    pub activity: String,
    pub combinations: Vec<NonDivergingCombination>,
}

// Represents a single event of a specific activity:
// - all_objects: all object IDs involved in the event
// - objects_by_type: grouping of relevant object IDs by their object type
#[derive(Debug)]
struct ActivityEventProfile {
    all_objects: BTreeSet<String>,
    objects_by_type: BTreeMap<String, BTreeSet<String>>,
}

pub async fn get_resource_miner(
    Path(file_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if file_id.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "file_id cannot be empty".to_string(),
        ));
    }

    let ocel = OCEL::import_from_path(&file_id).await?;

    let (divergence, _convergence, related, _deficiency) =
        catch_unwind(AssertUnwindSafe(|| ocel.get_interaction_patterns())).map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to compute interaction patterns".to_string(),
            )
        })?;

    let all_activities: Vec<String> = ocel.event_types.iter().map(|ev| ev.name.clone()).collect();
    let all_object_types: Vec<String> =
        ocel.object_types.iter().map(|ot| ot.name.clone()).collect();

    // An object type is resource if is is divergent in every activity is is related to.
    let mut object_resource: FxHashSet<String> = FxHashSet::default();
    for object_type in &all_object_types {
        let related_activities: Vec<&String> = related
            .iter()
            .filter_map(|(activity, related_object_types)| {
                if related_object_types.contains(object_type) {
                    Some(activity)
                } else {
                    None
                }
            })
            .collect();

        if related_activities.is_empty() {
            continue;
        }

        let is_resource = related_activities.iter().all(|activity| {
            divergence
                .get(*activity)
                .map(|div| div.contains(object_type))
                .unwrap_or(false)
        });

        if is_resource {
            object_resource.insert(object_type.clone());
        }
    }

    // An object type is non-resource if it is not divergent in at least one related activity.
    let mut object_type_not_resource: FxHashSet<String> = FxHashSet::default();
    let mut object_not_resource_arcs: Vec<ObjectNotResourceArc> = Vec::new();

    for activity in &all_activities {
        let related_object_types = related.get(activity).cloned().unwrap_or_default();
        for object_type in related_object_types {
            let is_divergent = divergence
                .get(activity)
                .map(|div| div.contains(&object_type))
                .unwrap_or(false);

            if !is_divergent {
                object_type_not_resource.insert(object_type.clone());
                object_not_resource_arcs.push(ObjectNotResourceArc {
                    source_type: object_type,
                    target_type: activity.clone(),
                });
            }
        }
    }

    let mut special_activity: Vec<String> = all_activities
        .iter()
        .filter(|activity| is_special_activity(&divergence, &related, activity))
        .cloned()
        .collect();

    let mut event_types_without_object_resource: Vec<String> = all_activities
        .iter()
        .filter(|activity| {
            if let Some(related_object_types) = related.get(*activity) {
                !related_object_types.is_empty()
                    && related_object_types
                        .iter()
                        .all(|object_type| !object_resource.contains(object_type))
            } else {
                false
            }
        })
        .cloned()
        .collect();

    // Converting sets to arrays for JSON response
    let mut object_resource: Vec<String> = object_resource.into_iter().collect();
    let mut object_type_not_resource: Vec<String> = object_type_not_resource.into_iter().collect();

    // Sorting arrays for deterministic JSON response
    object_resource.sort();
    object_type_not_resource.sort();
    special_activity.sort();
    event_types_without_object_resource.sort();
    object_not_resource_arcs.sort_by(|left, right| {
        left.source_type
            .cmp(&right.source_type)
            .then(left.target_type.cmp(&right.target_type))
    });

    // Creating response object
    let response = ResourceMinerResponse {
        object_type_not_resource,
        object_resource,
        event_types_without_object_resource,
        object_not_resource_arcs,
        special_activity,
    };

    Ok(Json(response))
}

// Handler for getting the non-diverging object type combinations for a special activity
pub async fn get_special_activity_non_diverging_combinations(
    Path((file_id, activity)): Path<(String, String)>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if file_id.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "file_id cannot be empty".to_string(),
        ));
    }

    if activity.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "activity cannot be empty".to_string(),
        ));
    }

    let ocel = OCEL::import_from_path(&file_id).await?;
    let (divergence, _convergence, related, _deficiency) =
        catch_unwind(AssertUnwindSafe(|| ocel.get_interaction_patterns())).map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to compute interaction patterns".to_string(),
            )
        })?;

    // Getting the set for related object types for the activity
    let related_object_types = related.get(&activity).cloned().unwrap_or_default();
    if related_object_types.is_empty() {
        return Err((
            StatusCode::NOT_FOUND,
            format!("Activity '{}' has no related object types", activity),
        ));
    }

    // Checking if the activity is a special activity (all related object types are divergent)
    let is_special = is_special_activity(&divergence, &related, &activity);

    // If the activity is not a special activity, return an error
    if !is_special {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Activity '{}' is not a special activity", activity),
        ));
    }

    // Search from size 2 upward to all related types.
    let max_size = related_object_types.len().max(2);
    // Converting set of related object types to list and sorting it
    let mut related_types_sorted: Vec<String> = related_object_types.into_iter().collect();
    related_types_sorted.sort();

    // If the number of related object types is less than 2, return an empty response
    if related_types_sorted.len() < 2 {
        let response = SpecialActivityCombinationResponse {
            activity,
            combinations: Vec::new(),
        };
        return Ok(Json(response));
    }

    // Building the mapping from object id to object type
    let object_id_to_type: BTreeMap<String, String> = ocel
        .objects
        .iter()
        .map(|object| (object.id.clone(), object.object_type.clone()))
        .collect();

    let activity_profiles =
        build_activity_event_profiles(&ocel, &activity, &related_types_sorted, &object_id_to_type);
    let mut selected_combination: Option<NonDivergingCombination> = None;
    for size in 2..=max_size {
        let type_combinations = generate_type_combinations_of_size(&related_types_sorted, size);
        for combination in type_combinations {
            if let Some((considered_events, joint_signatures)) =
                evaluate_joint_non_divergence(&activity_profiles, &combination)
            {
                selected_combination = Some(NonDivergingCombination {
                    object_types: combination,
                    considered_events,
                    joint_signatures,
                });
                break;
            }
        }
        if selected_combination.is_some() {
            break;
        }
    }

    let response = SpecialActivityCombinationResponse {
        activity,
        combinations: selected_combination.into_iter().collect(),
    };

    Ok(Json(response))
}

// Build reusable data for each event of one activity
fn build_activity_event_profiles(
    ocel: &OCEL,
    activity: &str,
    _related_types_sorted: &[String],
    object_id_to_type: &BTreeMap<String, String>,
) -> Vec<ActivityEventProfile> {
    ocel.events
        .iter()
        .filter(|event| event.event_type == activity)
        .map(|event| {
            let mut all_objects = BTreeSet::new();
            let mut objects_by_type: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();

            for relation in &event.relationships {
                all_objects.insert(relation.object_id.clone());
                if let Some(object_type) = object_id_to_type.get(&relation.object_id) {
                    objects_by_type
                        .entry(object_type.clone())
                        .or_default()
                        .insert(relation.object_id.clone());
                }
            }

            ActivityEventProfile {
                all_objects,
                objects_by_type,
            }
        })
        .collect()
}

fn build_combinations_recursive(
    types: &[String],
    target_size: usize,
    start_index: usize,
    current: &mut Vec<String>,
    all_combinations: &mut Vec<Vec<String>>,
) {
    if current.len() == target_size {
        all_combinations.push(current.clone());
        return;
    }

    for idx in start_index..types.len() {
        current.push(types[idx].clone());
        build_combinations_recursive(types, target_size, idx + 1, current, all_combinations);
        current.pop();
    }
}

fn evaluate_joint_non_divergence(
    activity_profiles: &[ActivityEventProfile],
    combination: &[String],
) -> Option<(usize, usize)> {
    // Group by the combination's concrete object signature.
    // For each signature we collect the set of "outside" contexts.
    let mut groups: BTreeMap<Vec<(String, BTreeSet<String>)>, FxHashSet<BTreeSet<String>>> =
        BTreeMap::new();
    let mut considered_events = 0usize;

    for profile in activity_profiles {
        // Signature of this event for the tested combination
        // (e.g., Worker->{W1}, Machine->{M2}).
        let mut joint_signature = Vec::with_capacity(combination.len());
        // All object IDs that belong to the tested combination.
        let mut joint_object_ids = BTreeSet::new();
        // Event is valid for this combo only if all combo types are present.
        let mut is_complete = true;

        for object_type in combination {
            match profile.objects_by_type.get(object_type) {
                Some(object_ids) if !object_ids.is_empty() => {
                    joint_signature.push((object_type.clone(), object_ids.clone()));
                    joint_object_ids.extend(object_ids.iter().cloned());
                }
                _ => {
                    is_complete = false;
                    break;
                }
            }
        }

        if !is_complete {
            // Skip events that do not contain all object types in the combination.
            continue;
        }

        considered_events += 1;
        // Treat the combination as one unit: compare only the context outside it.
        let context_without_joint: BTreeSet<String> = profile
            .all_objects
            .difference(&joint_object_ids)
            .cloned()
            .collect();
        groups
            .entry(joint_signature)
            .or_default()
            .insert(context_without_joint);
    }

    if groups.is_empty() {
        // No event contained all types from this combination.
        return None;
    }

    // Divergent if same combination signature appears with different outside contexts.
    let is_divergent = groups.values().any(|overall_sets| overall_sets.len() > 1);
    if is_divergent {
        return None;
    }

    // Non-divergent combination:
    // (number of usable events, number of distinct joint signatures).
    Some((considered_events, groups.len()))
}

fn is_special_activity(
    divergence: &rustc_hash::FxHashMap<String, FxHashSet<String>>,
    related: &rustc_hash::FxHashMap<String, FxHashSet<String>>,
    activity: &str,
) -> bool {
    if let Some(related_object_types) = related.get(activity) {
        !related_object_types.is_empty()
            && related_object_types.iter().all(|object_type| {
                divergence
                    .get(activity)
                    .map(|div| div.contains(object_type))
                    .unwrap_or(false)
            })
    } else {
        false
    }
}

fn generate_type_combinations_of_size(types: &[String], size: usize) -> Vec<Vec<String>> {
    let mut combinations = Vec::new();
    if types.len() < 2 || size < 2 || size > types.len() {
        return combinations;
    }

    let mut current = Vec::with_capacity(size);
    build_combinations_recursive(types, size, 0, &mut current, &mut combinations);
    combinations
}
