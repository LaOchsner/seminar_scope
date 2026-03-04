use std::collections::{HashMap, HashSet};

use crate::models::ocpt::{
    IdentityRelation, IdentityRelationKind, OCPTLeafLabel, OCPTNode, OCPTOperator,
};

use super::{
    check_noise_resistant_relation, detect_object_merge_split, NoiseResistantRelationFamily,
    Relation,
};

fn collect_activities(node: &OCPTNode, out: &mut HashSet<String>) {
    match node {
        OCPTNode::Leaf(leaf) => {
            if let OCPTLeafLabel::Activity(activity) = &leaf.activity_label {
                out.insert(activity.clone());
            }
        }
        OCPTNode::Operator(op) => {
            for child in &op.children {
                collect_activities(child, out);
            }
        }
    }
}

fn build_candidates(relations: &[Relation]) -> Vec<HashSet<String>> {
    let mut seen: HashSet<String> = HashSet::new();
    let mut ordered: Vec<String> = Vec::new();

    for (_eid, _activity, _timestamp, _oid, otype) in relations {
        if seen.insert(otype.clone()) {
            ordered.push(otype.clone());
        }
    }

    ordered
        .into_iter()
        .map(|otype| {
            let mut set = HashSet::new();
            set.insert(otype);
            set
        })
        .collect()
}

fn set_to_sorted_vec(set: &HashSet<String>) -> Vec<String> {
    let mut items: Vec<String> = set.iter().cloned().collect();
    items.sort();
    items.dedup();
    items
}

fn wrap_identity(
    node: OCPTNode,
    left: &HashSet<String>,
    right: &HashSet<String>,
    kind: IdentityRelationKind,
) -> OCPTNode {
    let rel = IdentityRelation {
        left: set_to_sorted_vec(left),
        right: set_to_sorted_vec(right),
        kind,
    };
    OCPTNode::Operator(OCPTOperator::new_identity(rel, node))
}

fn insert_subset_sync(
    node: OCPTNode,
    left: &HashSet<String>,
    right: &HashSet<String>,
    subset_activities: &HashSet<String>,
    kind: &IdentityRelationKind,
    root: bool,
) -> OCPTNode {
    if root {
        return match node {
            OCPTNode::Leaf(leaf) => wrap_identity(OCPTNode::Leaf(leaf), left, right, kind.clone()),
            OCPTNode::Operator(mut op) => {
                op.children = op
                    .children
                    .into_iter()
                    .map(|child| {
                        insert_subset_sync(child, left, right, subset_activities, kind, false)
                    })
                    .collect();
                wrap_identity(OCPTNode::Operator(op), left, right, kind.clone())
            }
        };
    }

    match node {
        OCPTNode::Leaf(leaf) => match &leaf.activity_label {
            OCPTLeafLabel::Activity(activity) if subset_activities.contains(activity) => {
                wrap_identity(OCPTNode::Leaf(leaf), left, right, kind.clone())
            }
            _ => OCPTNode::Leaf(leaf),
        },
        OCPTNode::Operator(mut op) => {
            let mut activities = HashSet::new();
            for child in &op.children {
                collect_activities(child, &mut activities);
            }

            let all_in_subset = !activities.is_empty()
                && activities.iter().all(|act| subset_activities.contains(act));
            if all_in_subset {
                return wrap_identity(OCPTNode::Operator(op), left, right, kind.clone());
            }

            let any_in_subset = activities.iter().any(|act| subset_activities.contains(act));
            if any_in_subset {
                op.children = op
                    .children
                    .into_iter()
                    .map(|child| {
                        insert_subset_sync(child, left, right, subset_activities, kind, false)
                    })
                    .collect();
            }

            OCPTNode::Operator(op)
        }
    }
}

fn classify_merge_or_split(
    relations: &[Relation],
    activity: &str,
    first_types: &HashSet<String>,
    last_types: &HashSet<String>,
) -> IdentityRelationKind {
    let mut first_by_event: HashMap<String, HashSet<String>> = HashMap::new();
    let mut last_by_event: HashMap<String, HashSet<String>> = HashMap::new();

    for (eid, row_activity, _timestamp, oid, otype) in relations {
        if row_activity != activity {
            continue;
        }
        if first_types.contains(otype) {
            first_by_event
                .entry(eid.clone())
                .or_default()
                .insert(oid.clone());
        }
        if last_types.contains(otype) {
            last_by_event
                .entry(eid.clone())
                .or_default()
                .insert(oid.clone());
        }
    }

    let mut split_votes = 0usize;
    let mut merge_votes = 0usize;
    let mut all_events: HashSet<String> = first_by_event.keys().cloned().collect();
    all_events.extend(last_by_event.keys().cloned());

    for eid in all_events {
        let first_count = first_by_event.get(&eid).map_or(0usize, HashSet::len);
        let last_count = last_by_event.get(&eid).map_or(0usize, HashSet::len);
        if first_count > last_count {
            split_votes += 1;
        } else if last_count > first_count {
            merge_votes += 1;
        }
    }

    if split_votes > merge_votes {
        IdentityRelationKind::ObjectSplit
    } else {
        IdentityRelationKind::ObjectMerge
    }
}

pub fn get_extended_ocpt(
    ocpt: OCPTNode,
    relations: &[Relation],
    candidates: Option<Vec<HashSet<String>>>,
    violation_threshold: f64,
) -> OCPTNode {
    match ocpt {
        OCPTNode::Leaf(leaf) => {
            if let OCPTLeafLabel::Activity(activity) = &leaf.activity_label {
                let available = leaf.related_ob_types.clone();
                if let Some((first_types, last_types)) = detect_object_merge_split(
                    relations,
                    activity,
                    &available,
                    violation_threshold,
                ) {
                    let first: HashSet<String> = first_types.into_iter().collect();
                    let last: HashSet<String> = last_types.into_iter().collect();
                    if !first.is_empty() && !last.is_empty() {
                        let kind = classify_merge_or_split(relations, activity, &first, &last);
                        return wrap_identity(OCPTNode::Leaf(leaf), &last, &first, kind);
                    }
                }
            }
            OCPTNode::Leaf(leaf)
        }
        OCPTNode::Operator(mut op) => {
            let mut candidates = candidates.unwrap_or_else(|| build_candidates(relations));
            if candidates.is_empty() {
                candidates = build_candidates(relations);
            }

            let mut activities = HashSet::new();
            for child in &op.children {
                collect_activities(child, &mut activities);
            }

            for family in [
                NoiseResistantRelationFamily::StrictSync,
                NoiseResistantRelationFamily::SubsetSync,
                NoiseResistantRelationFamily::Implication,
            ] {
                for ot1 in &candidates {
                    for ot2 in &candidates {
                        if ot1 == ot2 {
                            continue;
                        }

                        let mut union_types = ot1.clone();
                        union_types.extend(ot2.iter().cloned());

                        let sub_relations: Vec<Relation> = relations
                            .iter()
                            .filter(|(_eid, activity, _timestamp, _oid, otype)| {
                                activities.contains(activity) && union_types.contains(otype)
                            })
                            .cloned()
                            .collect();
                        if sub_relations.is_empty() {
                            continue;
                        }

                        let Some(found) = check_noise_resistant_relation(
                            ot1,
                            ot2,
                            &sub_relations,
                            violation_threshold,
                            family,
                        ) else {
                            continue;
                        };

                        let mut next_candidates: Vec<HashSet<String>> = candidates
                            .iter()
                            .filter(|set| *set != ot1 && *set != ot2)
                            .cloned()
                            .collect();
                        next_candidates.push(union_types);

                        let wrapped = OCPTNode::Operator(op);
                        let found_kind = found.kind.clone();
                        match found_kind {
                            IdentityRelationKind::SubsetSyncPartition
                            | IdentityRelationKind::SubsetSyncOverlap => {
                                let subset_activities =
                                    found.relaxed_activities.unwrap_or_default();
                                let subset_wrapped = insert_subset_sync(
                                    wrapped,
                                    ot1,
                                    ot2,
                                    &subset_activities,
                                    &found_kind,
                                    true,
                                );
                                return get_extended_ocpt(
                                    subset_wrapped,
                                    relations,
                                    Some(next_candidates),
                                    violation_threshold,
                                );
                            }
                            backend_kind => {
                                let extended_inner =
                                    get_extended_ocpt(
                                        wrapped,
                                        relations,
                                        Some(next_candidates),
                                        violation_threshold,
                                    );
                                return wrap_identity(extended_inner, ot1, ot2, backend_kind);
                            }
                        }
                    }
                }
            }

            let extended_children = op
                .children
                .into_iter()
                .map(|child| {
                    get_extended_ocpt(
                        child,
                        relations,
                        Some(candidates.clone()),
                        violation_threshold,
                    )
                })
                .collect();

            op.children = extended_children;
            OCPTNode::Operator(op)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::get_extended_ocpt;
    use crate::core::utils::relations::build_relations_from_ocels;
    use crate::models::ocel::OCEL;
    use crate::models::ocpt::OCPT;
    use std::collections::HashSet;
    use std::path::PathBuf;

    #[test]
    fn extend_order_management_ocpt_and_write_json() {
        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let input_path = manifest_dir
            .join("temp")
            .join("ocpt_order_managment_df2.json");
        let raw = std::fs::read_to_string(&input_path)
            .expect("failed to read temp/ocpt_order_managment_df2.json");
        let ocpt: OCPT = serde_json::from_str(&raw)
            .expect("failed to parse ocpt_order_managment_df2.json as OCPT");

        let ocel_path = manifest_dir
            .join("temp")
            .join("ocel_v2_126cd774-c16a-4d26-886a-6768add705c9.json");
        let ocel_raw = std::fs::read_to_string(&ocel_path).expect("failed to read ocel_v2_*.json");
        let ocel: OCEL =
            serde_json::from_str(&ocel_raw).expect("failed to parse ocel_v2_*.json as OCEL");
        let ocels = vec![ocel];
        let relations = build_relations_from_ocels(&ocels);

        fn singleton(value: &str) -> HashSet<String> {
            let mut set = HashSet::new();
            set.insert(value.to_string());
            set
        }

        let candidates = vec![
            singleton("items"),
            singleton("products"),
            singleton("customers"),
            singleton("orders"),
            singleton("employees"),
            singleton("packages"),
        ];

        let extended_root = get_extended_ocpt(ocpt.root, &relations, Some(candidates), 0.0);
        let extended = OCPT {
            root: extended_root,
        };

        let out_path = manifest_dir
            .join("temp")
            .join("ocpt_order_managment_df2_extended.json");
        let json =
            serde_json::to_string_pretty(&extended).expect("failed to serialize extended OCPT");
        std::fs::write(&out_path, &json).expect("failed to write extended OCPT json");

        println!("{}", out_path.display());
        println!("{}", json);
    }
}
