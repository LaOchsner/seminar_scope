use crate::models::ocel::{OCEL, OCELUtils};
use crate::traits::import_export::ImportableFromPath;
use axum::{Json, extract::Path, http::StatusCode, response::IntoResponse};
use rustc_hash::FxHashSet;
use serde::Serialize;
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

pub async fn get_resource_miner(
    Path(file_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if file_id.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "file_id cannot be empty".to_string()));
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
    let all_object_types: Vec<String> = ocel.object_types.iter().map(|ot| ot.name.clone()).collect();

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

    // An activity is special if all its related object types are divergent for that activity
    let mut special_activity: Vec<String> = all_activities
        .iter()
        .filter(|activity| {
            if let Some(related_object_types) = related.get(*activity) {
                !related_object_types.is_empty()
                    && related_object_types.iter().all(|object_type| {
                        divergence
                            .get(*activity)
                            .map(|div| div.contains(object_type))
                            .unwrap_or(false)
                    })
            } else {
                false
            }
        })
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
