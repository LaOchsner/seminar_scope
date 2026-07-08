#![allow(dead_code)] // Conversion is staged before a public EOCPN handler is wired in.

use crate::core::ocpn_conversion::{ConvertOcptToOcpnError, convert_ocpt_to_ocpn};
use crate::models::eocpn::{
    EOCPN, EOCPNArc, EOCPNId, EOCPNIdentityRelation, EOCPNIdentityRelationKind, EOCPNNodeRef,
    EOCPNPlace, EOCPNProperties, EOCPNTransition, EOCPNTransitionFunction,
};
use crate::models::ocpt::{
    IdentityRelation, IdentityRelationKind, OCPT, OCPTLeaf, OCPTLeafLabel, OCPTNode, OCPTOperator,
    OCPTOperatorType,
};
use serde_json::json;
use std::collections::{BTreeMap, BTreeSet};
use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConvertOcptToEocpnError {
    OcpnConversion(ConvertOcptToOcpnError),
    InvalidGeneratedEocpn,
}

impl fmt::Display for ConvertOcptToEocpnError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::OcpnConversion(error) => write!(f, "{error}"),
            Self::InvalidGeneratedEocpn => f.write_str("Generated EOCPN is invalid"),
        }
    }
}

impl std::error::Error for ConvertOcptToEocpnError {}

impl From<ConvertOcptToOcpnError> for ConvertOcptToEocpnError {
    fn from(value: ConvertOcptToOcpnError) -> Self {
        Self::OcpnConversion(value)
    }
}

pub fn convert_ocpt_to_eocpn(ocpt: &OCPT) -> Result<EOCPN, ConvertOcptToEocpnError> {
    let ocpn = convert_ocpt_to_ocpn(ocpt)?;
    let eocpn = EOCPN::from_ocpn(ocpn);
    if !eocpn.is_valid() {
        return Err(ConvertOcptToEocpnError::InvalidGeneratedEocpn);
    }
    Ok(eocpn)
}

pub fn convert_eocpt_to_eocpn_with_sync_identity(
    ocpt: &OCPT,
) -> Result<EOCPN, ConvertOcptToEocpnError> {
    convert_eocpt_to_eocpn_with_supported_identities(ocpt)
}

pub fn convert_eocpt_to_eocpn_with_supported_identities(
    ocpt: &OCPT,
) -> Result<EOCPN, ConvertOcptToEocpnError> {
    let mut supported_relations = Vec::new();
    let mut ignored_identity_counts = BTreeMap::new();
    let stripped_root = strip_identity_wrappers_for_supported_conversion(
        &ocpt.root,
        &mut supported_relations,
        &mut ignored_identity_counts,
    );
    let stripped_ocpt = OCPT::new(stripped_root);
    let mut eocpn = convert_ocpt_to_eocpn(&stripped_ocpt)?;

    add_identity_layers(&mut eocpn, &supported_relations);
    annotate_identity_conversion(
        &mut eocpn.properties,
        &supported_relations,
        ignored_identity_counts,
    );
    let eocpn = eocpn.normalize();
    if !eocpn.is_valid() {
        return Err(ConvertOcptToEocpnError::InvalidGeneratedEocpn);
    }
    Ok(eocpn)
}

fn strip_identity_wrappers_for_supported_conversion(
    node: &OCPTNode,
    supported_relations: &mut Vec<IdentityRelation>,
    ignored_identity_counts: &mut BTreeMap<String, usize>,
) -> OCPTNode {
    match node {
        OCPTNode::Leaf(leaf) => OCPTNode::Leaf(copy_leaf(leaf)),
        OCPTNode::Operator(op) => match &op.operator_type {
            OCPTOperatorType::IdentityRelation(relation) => {
                if is_supported_identity_kind(&relation.kind) {
                    supported_relations.push(normalize_relation(copy_identity_relation(relation)));
                } else {
                    let key = identity_kind_label(&relation.kind).to_string();
                    *ignored_identity_counts.entry(key).or_default() += 1;
                }

                let Some(child) = op.children.first() else {
                    return OCPTNode::Leaf(OCPTLeaf::new(None));
                };
                strip_identity_wrappers_for_supported_conversion(
                    child,
                    supported_relations,
                    ignored_identity_counts,
                )
            }
            operator_type => {
                let copied = OCPTOperator {
                    uuid: op.uuid,
                    operator_type: copy_operator_type(operator_type),
                    children: op
                        .children
                        .iter()
                        .map(|child| {
                            strip_identity_wrappers_for_supported_conversion(
                                child,
                                supported_relations,
                                ignored_identity_counts,
                            )
                        })
                        .collect(),
                };
                OCPTNode::Operator(copied)
            }
        },
    }
}

fn is_supported_identity_kind(kind: &IdentityRelationKind) -> bool {
    matches!(
        kind,
        IdentityRelationKind::Sync
            | IdentityRelationKind::SubsetSyncPartition
            | IdentityRelationKind::SubsetSyncOverlap
    )
}

fn copy_leaf(leaf: &OCPTLeaf) -> OCPTLeaf {
    OCPTLeaf {
        uuid: leaf.uuid,
        activity_label: match &leaf.activity_label {
            OCPTLeafLabel::Activity(activity) => OCPTLeafLabel::Activity(activity.clone()),
            OCPTLeafLabel::Tau => OCPTLeafLabel::Tau,
        },
        related_ob_types: leaf.related_ob_types.clone(),
        divergent_ob_types: leaf.divergent_ob_types.clone(),
        convergent_ob_types: leaf.convergent_ob_types.clone(),
        deficient_ob_types: leaf.deficient_ob_types.clone(),
    }
}

fn copy_identity_relation(relation: &IdentityRelation) -> IdentityRelation {
    IdentityRelation {
        left: relation.left.clone(),
        right: relation.right.clone(),
        kind: copy_identity_kind(&relation.kind),
    }
}

fn copy_operator_type(operator_type: &OCPTOperatorType) -> OCPTOperatorType {
    match operator_type {
        OCPTOperatorType::Sequence => OCPTOperatorType::Sequence,
        OCPTOperatorType::ExclusiveChoice => OCPTOperatorType::ExclusiveChoice,
        OCPTOperatorType::Concurrency => OCPTOperatorType::Concurrency,
        OCPTOperatorType::Loop(count) => OCPTOperatorType::Loop(*count),
        OCPTOperatorType::IdentityRelation(relation) => {
            OCPTOperatorType::IdentityRelation(copy_identity_relation(relation))
        }
    }
}

fn copy_identity_kind(kind: &IdentityRelationKind) -> IdentityRelationKind {
    match kind {
        IdentityRelationKind::Sync => IdentityRelationKind::Sync,
        IdentityRelationKind::SubsetSync => IdentityRelationKind::SubsetSync,
        IdentityRelationKind::SubsetSyncPartition => IdentityRelationKind::SubsetSyncPartition,
        IdentityRelationKind::SubsetSyncOverlap => IdentityRelationKind::SubsetSyncOverlap,
        IdentityRelationKind::ImpConcurrent => IdentityRelationKind::ImpConcurrent,
        IdentityRelationKind::ImpOrdered => IdentityRelationKind::ImpOrdered,
        IdentityRelationKind::ImpBatch(k) => IdentityRelationKind::ImpBatch(*k),
        IdentityRelationKind::ObjectSplit => IdentityRelationKind::ObjectSplit,
        IdentityRelationKind::ObjectMerge => IdentityRelationKind::ObjectMerge,
    }
}

fn normalize_relation(mut relation: IdentityRelation) -> IdentityRelation {
    relation.left.sort();
    relation.left.dedup();
    relation.right.sort();
    relation.right.dedup();
    relation
}

fn add_identity_layers(eocpn: &mut EOCPN, relations: &[IdentityRelation]) {
    let mut seen = BTreeSet::new();
    for relation in relations {
        let relation = normalize_relation(relation.clone());
        if !seen.insert((
            identity_kind_label(&relation.kind).to_string(),
            relation.left.clone(),
            relation.right.clone(),
        )) {
            continue;
        }

        let combined = combined_types(&relation);
        let prefix = identity_name_prefix(&relation.kind, &relation.left, &relation.right);
        let combined_place_id = next_id(eocpn);
        eocpn.places.push(EOCPNPlace {
            id: combined_place_id,
            name: format!("{prefix}_combined"),
            object_types: combined.clone(),
            initial: false,
            final_place: false,
            properties: identity_properties(&relation),
        });

        let join_transition_id = next_id(eocpn);
        eocpn.transitions.push(EOCPNTransition {
            id: join_transition_id,
            name: format!("{prefix}_join"),
            label: None,
            silent: true,
            function: Some(EOCPNTransitionFunction::IdentityEnforcement {
                left: relation.left.clone(),
                right: relation.right.clone(),
                combined: combined.clone(),
                relation_kind: eocpn_identity_kind(&relation.kind),
            }),
            properties: identity_properties(&relation),
        });

        let resolve_transition_id = next_id(eocpn);
        eocpn.transitions.push(EOCPNTransition {
            id: resolve_transition_id,
            name: format!("{prefix}_resolve"),
            label: None,
            silent: true,
            function: Some(EOCPNTransitionFunction::IdentityResolution {
                combined: combined.clone(),
                outputs: vec![relation.left.clone(), relation.right.clone()],
                relation_kind: eocpn_identity_kind(&relation.kind),
            }),
            properties: identity_properties(&relation),
        });

        let related_place_ids: Vec<EOCPNId> = eocpn
            .places
            .iter()
            .filter(|place| {
                place.object_types.len() == 1 && combined.contains(&place.object_types[0])
            })
            .map(|place| place.id)
            .collect();

        for place_id in related_place_ids {
            add_arc(
                eocpn,
                EOCPNNodeRef::Place(place_id),
                EOCPNNodeRef::Transition(join_transition_id),
                false,
            );
            add_arc(
                eocpn,
                EOCPNNodeRef::Transition(join_transition_id),
                EOCPNNodeRef::Place(place_id),
                false,
            );
            add_arc(
                eocpn,
                EOCPNNodeRef::Place(place_id),
                EOCPNNodeRef::Transition(resolve_transition_id),
                false,
            );
            add_arc(
                eocpn,
                EOCPNNodeRef::Transition(resolve_transition_id),
                EOCPNNodeRef::Place(place_id),
                false,
            );
        }

        add_arc(
            eocpn,
            EOCPNNodeRef::Transition(join_transition_id),
            EOCPNNodeRef::Place(combined_place_id),
            false,
        );
        add_arc(
            eocpn,
            EOCPNNodeRef::Place(combined_place_id),
            EOCPNNodeRef::Transition(resolve_transition_id),
            false,
        );

        let identity_relation_id = next_id(eocpn);
        eocpn.identity_relations.push(EOCPNIdentityRelation {
            id: identity_relation_id,
            kind: eocpn_identity_kind(&relation.kind),
            left: relation.left.clone(),
            right: relation.right.clone(),
            combined,
            join_transition_id: Some(join_transition_id),
            resolve_transition_id: Some(resolve_transition_id),
            combined_place_id: Some(combined_place_id),
            properties: identity_properties(&relation),
        });
    }
}

fn add_arc(eocpn: &mut EOCPN, source: EOCPNNodeRef, target: EOCPNNodeRef, variable: bool) {
    if eocpn
        .arcs
        .iter()
        .any(|arc| arc.source == source && arc.target == target)
    {
        return;
    }

    let id = next_id(eocpn);
    eocpn.arcs.push(EOCPNArc {
        id,
        source,
        target,
        variable,
        weight: 1,
        properties: EOCPNProperties::new(),
    });
}

fn next_id(eocpn: &EOCPN) -> EOCPNId {
    eocpn
        .places
        .iter()
        .map(|place| place.id)
        .chain(eocpn.transitions.iter().map(|transition| transition.id))
        .chain(eocpn.arcs.iter().map(|arc| arc.id))
        .chain(eocpn.identity_relations.iter().map(|relation| relation.id))
        .max()
        .unwrap_or(0)
        + 1
}

fn combined_types(relation: &IdentityRelation) -> Vec<String> {
    let mut combined = relation
        .left
        .iter()
        .chain(relation.right.iter())
        .cloned()
        .collect::<Vec<_>>();
    combined.sort();
    combined.dedup();
    combined
}

fn identity_name_prefix(kind: &IdentityRelationKind, left: &[String], right: &[String]) -> String {
    format!(
        "tau_{}_{}_{}",
        identity_kind_snake(kind),
        left.join("_").replace(' ', "_"),
        right.join("_").replace(' ', "_")
    )
}

fn identity_properties(relation: &IdentityRelation) -> EOCPNProperties {
    BTreeMap::from([(
        "identity_relation".to_string(),
        json!({
            "kind": identity_kind_label(&relation.kind),
            "left": &relation.left,
            "right": &relation.right,
            "combined": combined_types(relation),
        }),
    )])
}

fn identity_kind_label(kind: &IdentityRelationKind) -> &'static str {
    match kind {
        IdentityRelationKind::Sync => "Sync",
        IdentityRelationKind::SubsetSync => "SubsetSync",
        IdentityRelationKind::SubsetSyncPartition => "SubsetSyncPartition",
        IdentityRelationKind::SubsetSyncOverlap => "SubsetSyncOverlap",
        IdentityRelationKind::ImpConcurrent => "ImpConcurrent",
        IdentityRelationKind::ImpOrdered => "ImpOrdered",
        IdentityRelationKind::ImpBatch(_) => "ImpBatch",
        IdentityRelationKind::ObjectSplit => "ObjectSplit",
        IdentityRelationKind::ObjectMerge => "ObjectMerge",
    }
}

fn identity_kind_snake(kind: &IdentityRelationKind) -> &'static str {
    match kind {
        IdentityRelationKind::Sync => "sync",
        IdentityRelationKind::SubsetSync => "subset_sync",
        IdentityRelationKind::SubsetSyncPartition => "subset_sync_partition",
        IdentityRelationKind::SubsetSyncOverlap => "subset_sync_overlap",
        IdentityRelationKind::ImpConcurrent => "imp_concurrent",
        IdentityRelationKind::ImpOrdered => "imp_ordered",
        IdentityRelationKind::ImpBatch(_) => "imp_batch",
        IdentityRelationKind::ObjectSplit => "object_split",
        IdentityRelationKind::ObjectMerge => "object_merge",
    }
}

fn eocpn_identity_kind(kind: &IdentityRelationKind) -> EOCPNIdentityRelationKind {
    match kind {
        IdentityRelationKind::Sync => EOCPNIdentityRelationKind::Sync,
        IdentityRelationKind::SubsetSync => EOCPNIdentityRelationKind::SubsetSync,
        IdentityRelationKind::SubsetSyncPartition => EOCPNIdentityRelationKind::SubsetSyncPartition,
        IdentityRelationKind::SubsetSyncOverlap => EOCPNIdentityRelationKind::SubsetSyncOverlap,
        IdentityRelationKind::ImpConcurrent => EOCPNIdentityRelationKind::ImpConcurrent,
        IdentityRelationKind::ImpOrdered => EOCPNIdentityRelationKind::ImpOrdered,
        IdentityRelationKind::ImpBatch(k) => EOCPNIdentityRelationKind::ImpBatch(*k),
        IdentityRelationKind::ObjectSplit => EOCPNIdentityRelationKind::ObjectSplit,
        IdentityRelationKind::ObjectMerge => EOCPNIdentityRelationKind::ObjectMerge,
    }
}

fn annotate_identity_conversion(
    properties: &mut EOCPNProperties,
    supported_relations: &[IdentityRelation],
    ignored_identity_counts: BTreeMap<String, usize>,
) {
    let mut supported_counts = BTreeMap::new();
    for relation in supported_relations {
        *supported_counts
            .entry(identity_kind_label(&relation.kind).to_string())
            .or_insert(0) += 1;
    }

    properties.insert(
        "identity_conversion".to_string(),
        json!({
            "supported": ["Sync", "SubsetSyncPartition", "SubsetSyncOverlap"],
            "supported_identity_counts": supported_counts,
            "supported_relation_count": supported_relations.len(),
            "ignored_identity_counts": ignored_identity_counts,
        }),
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ocpt::{
        IdentityRelation, IdentityRelationKind, OCPTLeaf, OCPTLeafLabel, OCPTNode, OCPTOperator,
        OCPTOperatorType,
    };
    use std::collections::HashSet;
    use std::path::PathBuf;
    use uuid::Uuid;

    fn sample_ocpt() -> OCPT {
        let first = OCPTNode::Leaf(OCPTLeaf {
            uuid: Uuid::from_u128(1),
            activity_label: OCPTLeafLabel::Activity("create".to_string()),
            related_ob_types: HashSet::from(["order".to_string()]),
            divergent_ob_types: HashSet::new(),
            convergent_ob_types: HashSet::new(),
            deficient_ob_types: HashSet::new(),
        });
        let second = OCPTNode::Leaf(OCPTLeaf {
            uuid: Uuid::from_u128(2),
            activity_label: OCPTLeafLabel::Activity("ship".to_string()),
            related_ob_types: HashSet::from(["order".to_string()]),
            divergent_ob_types: HashSet::new(),
            convergent_ob_types: HashSet::new(),
            deficient_ob_types: HashSet::new(),
        });
        let mut sequence = OCPTOperator::new(OCPTOperatorType::Sequence);
        sequence.children = vec![first, second];
        OCPT::new(OCPTNode::Operator(sequence))
    }

    #[test]
    fn converts_regular_ocpt_to_valid_eocpn() {
        let eocpn = convert_ocpt_to_eocpn(&sample_ocpt()).unwrap();

        assert!(eocpn.is_valid());
        assert!(
            eocpn
                .places
                .iter()
                .all(|place| place.object_types.len() == 1)
        );
        assert!(
            eocpn
                .transitions
                .iter()
                .all(|transition| transition.function.is_none())
        );
        assert_eq!(
            eocpn.nets.keys().cloned().collect::<Vec<_>>(),
            vec!["order"]
        );
    }

    #[test]
    fn keeps_identity_relations_out_of_the_compatibility_path_for_now() {
        let relation = IdentityRelation {
            left: vec!["order".to_string()],
            right: vec!["item".to_string()],
            kind: IdentityRelationKind::Sync,
        };
        let wrapped = OCPT::new(OCPTNode::Operator(OCPTOperator::new_identity(
            relation,
            sample_ocpt().root,
        )));

        let err = convert_ocpt_to_eocpn(&wrapped).unwrap_err();
        assert!(matches!(
            err,
            ConvertOcptToEocpnError::OcpnConversion(
                ConvertOcptToOcpnError::UnsupportedIdentityRelations
            )
        ));
    }

    #[test]
    fn converts_supported_identity_relations_to_eocpn_layers() {
        let relation = IdentityRelation {
            left: vec!["order".to_string()],
            right: vec!["item".to_string()],
            kind: IdentityRelationKind::SubsetSyncPartition,
        };
        let wrapped = OCPT::new(OCPTNode::Operator(OCPTOperator::new_identity(
            relation,
            sample_ocpt().root,
        )));
        let eocpn = convert_eocpt_to_eocpn_with_supported_identities(&wrapped).unwrap();

        assert!(eocpn.is_valid());
        assert!(
            eocpn
                .places
                .iter()
                .any(|place| place.object_types == vec!["item".to_string(), "order".to_string()])
        );
        assert!(eocpn.transitions.iter().any(|transition| matches!(
            transition.function,
            Some(EOCPNTransitionFunction::IdentityEnforcement {
                relation_kind: EOCPNIdentityRelationKind::SubsetSyncPartition,
                ..
            })
        )));
        assert!(eocpn.transitions.iter().any(|transition| matches!(
            transition.function,
            Some(EOCPNTransitionFunction::IdentityResolution {
                relation_kind: EOCPNIdentityRelationKind::SubsetSyncPartition,
                ..
            })
        )));
    }

    #[test]
    fn keeps_unsupported_identity_relations_in_conversion_metadata() {
        let relation = IdentityRelation {
            left: vec!["order".to_string()],
            right: vec!["item".to_string()],
            kind: IdentityRelationKind::ImpOrdered,
        };
        let wrapped = OCPT::new(OCPTNode::Operator(OCPTOperator::new_identity(
            relation,
            sample_ocpt().root,
        )));

        let eocpn = convert_eocpt_to_eocpn_with_supported_identities(&wrapped).unwrap();
        let metadata = eocpn
            .properties
            .get("identity_conversion")
            .expect("identity conversion metadata should be present");

        assert_eq!(metadata["ignored_identity_counts"]["ImpOrdered"], 1);
        assert_eq!(metadata["supported_relation_count"], 0);
    }

    #[test]
    fn temp_extended_ocpt_files_remain_outside_the_compatibility_path_if_present() {
        let temp_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("temp");
        let Ok(entries) = std::fs::read_dir(&temp_dir) else {
            return;
        };

        let extended_paths: Vec<PathBuf> = entries
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| {
                        name.starts_with("extended_ocpt_") && name.ends_with(".json")
                    })
            })
            .collect();

        for path in extended_paths {
            let raw = std::fs::read_to_string(&path).unwrap();
            let extended_ocpt: OCPT = serde_json::from_str(&raw).unwrap();
            let identity_count = count_identity_relations(&extended_ocpt.root);

            assert!(
                identity_count > 0,
                "expected temp extended OCPT to contain identity relations: {}",
                path.display()
            );
            let err = convert_ocpt_to_eocpn(&extended_ocpt).unwrap_err();
            assert!(
                matches!(
                    err,
                    ConvertOcptToEocpnError::OcpnConversion(
                        ConvertOcptToOcpnError::UnsupportedIdentityRelations
                    )
                ),
                "extended OCPT should stay outside the OCPN-compatible EOCPN path until identity conversion is implemented: {}",
                path.display()
            );
        }
    }

    #[test]
    fn writes_temp_supported_identity_eocpn_files_for_present_extended_ocpts() {
        let temp_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("temp");
        let Ok(entries) = std::fs::read_dir(&temp_dir) else {
            return;
        };
        let out_dir = temp_dir.join("test");
        std::fs::create_dir_all(&out_dir).unwrap();

        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
                continue;
            };
            let Some(file_id) = name
                .strip_prefix("extended_ocpt_")
                .and_then(|rest| rest.strip_suffix(".json"))
            else {
                continue;
            };

            let raw = std::fs::read_to_string(&path).unwrap();
            let extended_ocpt: OCPT = serde_json::from_str(&raw).unwrap();
            if count_supported_identity_relations(&extended_ocpt.root) == 0 {
                continue;
            }

            let eocpn = convert_eocpt_to_eocpn_with_supported_identities(&extended_ocpt).unwrap();
            let out_path = out_dir.join(format!("eocpn_identity_{file_id}.json"));
            let json = serde_json::to_string_pretty(&eocpn).unwrap();
            std::fs::write(out_path, json).unwrap();
        }
    }

    fn count_identity_relations(node: &OCPTNode) -> usize {
        match node {
            OCPTNode::Leaf(_) => 0,
            OCPTNode::Operator(op) => {
                let current = usize::from(matches!(
                    op.operator_type,
                    OCPTOperatorType::IdentityRelation(_)
                ));
                current
                    + op.children
                        .iter()
                        .map(count_identity_relations)
                        .sum::<usize>()
            }
        }
    }

    fn count_supported_identity_relations(node: &OCPTNode) -> usize {
        match node {
            OCPTNode::Leaf(_) => 0,
            OCPTNode::Operator(op) => {
                let current = match &op.operator_type {
                    OCPTOperatorType::IdentityRelation(relation) => {
                        usize::from(is_supported_identity_kind(&relation.kind))
                    }
                    _ => 0,
                };
                current
                    + op.children
                        .iter()
                        .map(count_supported_identity_relations)
                        .sum::<usize>()
            }
        }
    }
}
