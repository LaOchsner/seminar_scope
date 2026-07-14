use crate::models::ocel_sid_df2_miner::OcelJson;
use std::collections::{HashMap, HashSet};

type Relation = (String, String, String, String, String); // (eid, activity, timestamp, oid, otype)

fn sort_hashmap_values(map: HashMap<String, HashSet<String>>) -> HashMap<String, Vec<String>> {
    map.into_iter()
        .map(|(k, v)| {
            let mut sorted_vec: Vec<String> = v.into_iter().collect();
            sorted_vec.sort();
            (k, sorted_vec)
        })
        .collect()
}

pub fn get_interaction_patterns(
    relations: &Vec<Relation>,
    ocel: &OcelJson,
    noise_threshold: f64,
) -> (
    HashMap<String, Vec<String>>, // divergent (sorted)
    HashMap<String, Vec<String>>, // convergent (sorted)
    HashMap<String, Vec<String>>, // related (sorted)
    HashMap<String, Vec<String>>, // deficient (sorted)
    Vec<String>,                  // set of all activities (sorted)
    Vec<String>,                  // set of all object types (sorted)
) {
    get_interaction_patterns_noise_resistant(relations, ocel, noise_threshold.min(1.0))
}

fn get_interaction_patterns_noise_resistant(
    relations: &Vec<Relation>,
    ocel: &OcelJson,
    noise_threshold: f64,
) -> (
    HashMap<String, Vec<String>>, // divergent (sorted)
    HashMap<String, Vec<String>>, // convergent (sorted)
    HashMap<String, Vec<String>>, // related (sorted)
    HashMap<String, Vec<String>>, // deficient (sorted)
    Vec<String>,                  // set of all activities (sorted)
    Vec<String>,                  // set of all object types (sorted)
) {
    let mut all_activities: HashSet<String> = ocel
        .events
        .iter()
        .map(|event| event.activity.clone())
        .collect();
    let mut all_object_types: HashSet<String> = ocel
        .objects
        .iter()
        .map(|object| object.object_type.clone())
        .collect();

    for (_, activity, _, _, otype) in relations {
        all_activities.insert(activity.clone());
        all_object_types.insert(otype.clone());
    }

    let mut activity_events: HashMap<String, Vec<String>> = HashMap::new();
    for event in &ocel.events {
        activity_events
            .entry(event.activity.clone())
            .or_default()
            .push(event.id.clone());
    }

    let mut type_objects: HashMap<String, Vec<String>> = HashMap::new();
    for object in &ocel.objects {
        type_objects
            .entry(object.object_type.clone())
            .or_default()
            .push(object.id.clone());
    }

    let mut event_type_counts: HashMap<(String, String), usize> = HashMap::new();
    let mut object_activity_counts: HashMap<(String, String), usize> = HashMap::new();
    for (event_id, activity, _, object_id, object_type) in relations {
        *event_type_counts
            .entry((event_id.clone(), object_type.clone()))
            .or_default() += 1;
        *object_activity_counts
            .entry((object_id.clone(), activity.clone()))
            .or_default() += 1;
    }

    let mut related: HashMap<String, HashSet<String>> = HashMap::new();
    let mut divergent: HashMap<String, HashSet<String>> = HashMap::new();
    let mut convergent: HashMap<String, HashSet<String>> = HashMap::new();
    let mut deficient: HashMap<String, HashSet<String>> = HashMap::new();

    for activity in &all_activities {
        related.insert(activity.clone(), HashSet::new());
        divergent.insert(activity.clone(), HashSet::new());
        convergent.insert(activity.clone(), HashSet::new());
        deficient.insert(activity.clone(), HashSet::new());
    }

    for activity in &all_activities {
        let events_for_activity = activity_events.get(activity).cloned().unwrap_or_default();

        for object_type in &all_object_types {
            let objects_for_type = type_objects.get(object_type).cloned().unwrap_or_default();

            let mul_activity_object_type: Vec<usize> = events_for_activity
                .iter()
                .map(|event_id| {
                    event_type_counts
                        .get(&(event_id.clone(), object_type.clone()))
                        .copied()
                        .unwrap_or(0)
                })
                .collect();

            let mul_object_type_activity: Vec<usize> = objects_for_type
                .iter()
                .map(|object_id| {
                    object_activity_counts
                        .get(&(object_id.clone(), activity.clone()))
                        .copied()
                        .unwrap_or(0)
                })
                .collect();

            let combined_len = mul_activity_object_type.len() + mul_object_type_activity.len();
            if combined_len == 0 {
                continue;
            }

            let non_zero_count = mul_activity_object_type
                .iter()
                .chain(mul_object_type_activity.iter())
                .filter(|count| **count != 0)
                .count();
            let is_related = ratio(non_zero_count, combined_len) >= noise_threshold;
            if !is_related {
                continue;
            }

            related
                .get_mut(activity)
                .unwrap()
                .insert(object_type.clone());

            if !mul_activity_object_type.is_empty()
                && ratio(
                    mul_activity_object_type
                        .iter()
                        .filter(|count| **count > 1)
                        .count(),
                    mul_activity_object_type.len(),
                ) >= noise_threshold
            {
                convergent
                    .get_mut(activity)
                    .unwrap()
                    .insert(object_type.clone());
            }

            if !mul_activity_object_type.is_empty()
                && ratio(
                    mul_activity_object_type
                        .iter()
                        .filter(|count| **count < 1)
                        .count(),
                    mul_activity_object_type.len(),
                ) >= noise_threshold
            {
                deficient
                    .get_mut(activity)
                    .unwrap()
                    .insert(object_type.clone());
            }

            if !mul_object_type_activity.is_empty()
                && ratio(
                    mul_object_type_activity
                        .iter()
                        .filter(|count| **count != 1)
                        .count(),
                    mul_object_type_activity.len(),
                ) >= noise_threshold
            {
                divergent
                    .get_mut(activity)
                    .unwrap()
                    .insert(object_type.clone());
            }
        }
    }

    let divergent_sorted = sort_hashmap_values(divergent);
    let convergent_sorted = sort_hashmap_values(convergent);
    let related_sorted = sort_hashmap_values(related);
    let deficient_sorted = sort_hashmap_values(deficient);

    let mut all_activities_sorted: Vec<String> = all_activities.into_iter().collect();
    all_activities_sorted.sort();

    let mut all_object_types_sorted: Vec<String> = all_object_types.into_iter().collect();
    all_object_types_sorted.sort();

    (
        divergent_sorted,
        convergent_sorted,
        related_sorted,
        deficient_sorted,
        all_activities_sorted,
        all_object_types_sorted,
    )
}

fn ratio(count: usize, total: usize) -> f64 {
    if total == 0 {
        0.0
    } else {
        count as f64 / total as f64
    }
}

#[cfg(test)]
mod tests {
    use super::get_interaction_patterns;
    use crate::models::ocel_sid_df2_miner::{
        Event, EventType, Object, ObjectType, OcelJson, Relationship,
    };

    fn relationship(object_id: &str) -> Relationship {
        Relationship {
            object_id: object_id.to_string(),
            qualifier: String::new(),
        }
    }

    fn event(id: &str, activity: &str, object_ids: &[&str]) -> Event {
        Event {
            id: id.to_string(),
            activity: activity.to_string(),
            time: id.to_string(),
            attributes: None,
            relationships: object_ids
                .iter()
                .map(|object_id| relationship(object_id))
                .collect(),
        }
    }

    fn object(id: &str, object_type: &str) -> Object {
        Object {
            id: id.to_string(),
            object_type: object_type.to_string(),
            attributes: None,
        }
    }

    fn ocel() -> OcelJson {
        OcelJson {
            object_types: Vec::<ObjectType>::new(),
            event_types: Vec::<EventType>::new(),
            events: vec![
                event("e1", "pack", &["i1", "i2"]),
                event("e2", "pack", &["i1"]),
                event("e3", "pack", &[]),
                event("e4", "pack", &[]),
            ],
            objects: vec![
                object("i1", "item"),
                object("i2", "item"),
                object("i3", "item"),
            ],
        }
    }

    #[test]
    fn noise_resistant_multiplicities_follow_threshold_formulas() {
        let ocel = ocel();
        let relations = crate::core::df2_miner::build_relations_fns::build_relations(
            &ocel.events,
            &ocel.objects,
        );

        let (divergent, convergent, related, deficient, _, _) =
            get_interaction_patterns(&relations, &ocel, 0.5);

        assert_eq!(related["pack"], vec!["item".to_string()]);
        assert_eq!(deficient["pack"], vec!["item".to_string()]);
        assert_eq!(divergent["pack"], vec!["item".to_string()]);
        assert!(convergent["pack"].is_empty());
    }

    #[test]
    fn zero_noise_threshold_applies_formulas_literally() {
        let ocel = ocel();
        let relations = crate::core::df2_miner::build_relations_fns::build_relations(
            &ocel.events,
            &ocel.objects,
        );

        let (divergent, convergent, related, deficient, _, _) =
            get_interaction_patterns(&relations, &ocel, 0.0);

        assert_eq!(related["pack"], vec!["item".to_string()]);
        assert_eq!(convergent["pack"], vec!["item".to_string()]);
        assert_eq!(deficient["pack"], vec!["item".to_string()]);
        assert_eq!(divergent["pack"], vec!["item".to_string()]);
    }
}
