use crate::models::ocpt::{OCPTLeafLabel, OCPTNode, OCPTOperatorType};
use std::collections::HashSet;
use std::error::Error;
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReductionRule {
    R1ConcurrentAssociativity,
    R2ChoiceAssociativity,
    R3SequenceAssociativity,
    R4IndependentSubtrees,
    R5RemoveUnaryOperator,
    R6DeterministicOrdering,
}

#[derive(Debug)]
pub struct NormalFormResult {
    pub root: OCPTNode,
    pub applied_rules: Vec<ReductionRule>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NormalizationError {
    LoopOperator,
    IdentityRelationOperator,
    EmptyOperator,
    TauLeaf,
    DuplicateActivityLabel(String),
    NoNonDivergentRelatedType(String),
    DivergentTypesNotRelated(String),
    ConvergentTypesNotRelated(String),
    DeficientTypesNotRelated(String),
}

impl fmt::Display for NormalizationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::LoopOperator => write!(f, "loop operators are outside the supported model class"),
            Self::IdentityRelationOperator => {
                write!(f, "identity-relation operators cannot be normalized")
            }
            Self::EmptyOperator => write!(f, "operator nodes must contain at least one child"),
            Self::TauLeaf => write!(f, "tau leaves are outside the supported model class"),
            Self::DuplicateActivityLabel(activity) => {
                write!(f, "activity label {activity:?} occurs more than once")
            }
            Self::NoNonDivergentRelatedType(activity) => write!(
                f,
                "activity {activity:?} has no related non-divergent object type"
            ),
            Self::DivergentTypesNotRelated(activity) => write!(
                f,
                "activity {activity:?} has divergent types that are not related"
            ),
            Self::ConvergentTypesNotRelated(activity) => write!(
                f,
                "activity {activity:?} has convergent types that are not related"
            ),
            Self::DeficientTypesNotRelated(activity) => write!(
                f,
                "activity {activity:?} has deficient types that are not related"
            ),
        }
    }
}

impl Error for NormalizationError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum NormalFormOperator {
    Sequence,
    ExclusiveChoice,
    Concurrency,
}

impl NormalFormOperator {
    fn from_operator(operator: &OCPTOperatorType) -> Option<Self> {
        match operator {
            OCPTOperatorType::Sequence => Some(Self::Sequence),
            OCPTOperatorType::ExclusiveChoice => Some(Self::ExclusiveChoice),
            OCPTOperatorType::Concurrency => Some(Self::Concurrency),
            OCPTOperatorType::Loop(_) | OCPTOperatorType::IdentityRelation(_) => None,
        }
    }

    fn into_operator(self) -> OCPTOperatorType {
        match self {
            Self::Sequence => OCPTOperatorType::Sequence,
            Self::ExclusiveChoice => OCPTOperatorType::ExclusiveChoice,
            Self::Concurrency => OCPTOperatorType::Concurrency,
        }
    }

    fn key(self) -> char {
        match self {
            Self::Sequence => 'S',
            Self::ExclusiveChoice => 'X',
            Self::Concurrency => 'C',
        }
    }
}

pub fn normalize_candidate_tree(root: OCPTNode) -> Result<NormalFormResult, NormalizationError> {
    let mut activities = HashSet::new();
    let mut object_types = HashSet::new();
    validate_and_collect(&root, &mut activities, &mut object_types)?;

    let mut applied_rules = Vec::new();
    let mut root = normalize_ocpt(root, None, &object_types, &mut applied_rules);
    apply_ordering_recursively(&mut root, &object_types, &mut applied_rules);

    Ok(NormalFormResult {
        root,
        applied_rules,
    })
}

fn validate_and_collect(
    node: &OCPTNode,
    activities: &mut HashSet<String>,
    object_types: &mut HashSet<String>,
) -> Result<(), NormalizationError> {
    match node {
        OCPTNode::Operator(operator) => {
            match &operator.operator_type {
                OCPTOperatorType::Loop(_) => return Err(NormalizationError::LoopOperator),
                OCPTOperatorType::IdentityRelation(_) => {
                    return Err(NormalizationError::IdentityRelationOperator);
                }
                OCPTOperatorType::Sequence
                | OCPTOperatorType::ExclusiveChoice
                | OCPTOperatorType::Concurrency => {}
            }

            if operator.children.is_empty() {
                return Err(NormalizationError::EmptyOperator);
            }

            for child in &operator.children {
                validate_and_collect(child, activities, object_types)?;
            }
        }
        OCPTNode::Leaf(leaf) => {
            let activity = match &leaf.activity_label {
                OCPTLeafLabel::Activity(activity) => activity,
                OCPTLeafLabel::Tau => return Err(NormalizationError::TauLeaf),
            };

            if !activities.insert(activity.clone()) {
                return Err(NormalizationError::DuplicateActivityLabel(activity.clone()));
            }
            if !leaf.divergent_ob_types.is_subset(&leaf.related_ob_types) {
                return Err(NormalizationError::DivergentTypesNotRelated(
                    activity.clone(),
                ));
            }
            if !leaf.convergent_ob_types.is_subset(&leaf.related_ob_types) {
                return Err(NormalizationError::ConvergentTypesNotRelated(
                    activity.clone(),
                ));
            }
            if !leaf.deficient_ob_types.is_subset(&leaf.related_ob_types) {
                return Err(NormalizationError::DeficientTypesNotRelated(
                    activity.clone(),
                ));
            }
            if leaf
                .related_ob_types
                .difference(&leaf.divergent_ob_types)
                .next()
                .is_none()
            {
                return Err(NormalizationError::NoNonDivergentRelatedType(
                    activity.clone(),
                ));
            }

            object_types.extend(leaf.related_ob_types.iter().cloned());
        }
    }

    Ok(())
}

fn normalize_ocpt(
    node: OCPTNode,
    parent_kind: Option<NormalFormOperator>,
    object_types: &HashSet<String>,
    applied_rules: &mut Vec<ReductionRule>,
) -> OCPTNode {
    let OCPTNode::Operator(mut operator) = node else {
        return node;
    };

    let mut operator_kind = NormalFormOperator::from_operator(&operator.operator_type)
        .expect("validation excludes unsupported operators");
    operator.children = operator
        .children
        .into_iter()
        .map(|child| normalize_ocpt(child, Some(operator_kind), object_types, applied_rules))
        .collect();

    loop {
        if operator.children.len() == 1 {
            applied_rules.push(ReductionRule::R5RemoveUnaryOperator);
            let child = operator.children.pop().expect("unary operator has a child");
            return normalize_ocpt(child, parent_kind, object_types, applied_rules);
        }

        if flatten_associative_child(&mut operator.children, operator_kind, object_types) {
            applied_rules.push(match operator_kind {
                NormalFormOperator::Concurrency => ReductionRule::R1ConcurrentAssociativity,
                NormalFormOperator::ExclusiveChoice => ReductionRule::R2ChoiceAssociativity,
                NormalFormOperator::Sequence => ReductionRule::R3SequenceAssociativity,
            });
            continue;
        }

        let r4_target = match parent_kind {
            Some(parent_kind) if parent_kind != operator_kind => Some(parent_kind),
            None if operator_kind != NormalFormOperator::Concurrency => {
                Some(NormalFormOperator::Concurrency)
            }
            _ => None,
        };
        if let Some(target) = r4_target
            && check_subtree_independence(&operator.children, object_types)
        {
            operator_kind = target;
            operator.operator_type = target.into_operator();
            applied_rules.push(ReductionRule::R4IndependentSubtrees);
            operator.children = operator
                .children
                .into_iter()
                .map(|child| normalize_ocpt(child, Some(target), object_types, applied_rules))
                .collect();
            continue;
        }

        return OCPTNode::Operator(operator);
    }
}

fn flatten_associative_child(
    children: &mut Vec<OCPTNode>,
    parent_kind: NormalFormOperator,
    object_types: &HashSet<String>,
) -> bool {
    for child_index in 0..children.len() {
        let can_flatten = match &children[child_index] {
            OCPTNode::Operator(child_operator)
                if NormalFormOperator::from_operator(&child_operator.operator_type)
                    == Some(parent_kind) =>
            {
                match parent_kind {
                    NormalFormOperator::Concurrency => true,
                    NormalFormOperator::ExclusiveChoice => {
                        let child_divergent =
                            divergent_or_unrelated_one(&children[child_index], object_types);
                        let parent_divergent =
                            divergent_or_unrelated_slice(children.as_slice(), object_types);
                        child_divergent.is_subset(&parent_divergent)
                    }
                    NormalFormOperator::Sequence => {
                        let child_divergent =
                            divergent_or_unrelated_one(&children[child_index], object_types);
                        child_operator.children.iter().all(|grandchild| {
                            divergent_or_unrelated_one(grandchild, object_types)
                                .is_subset(&child_divergent)
                        })
                    }
                }
            }
            _ => false,
        };

        if !can_flatten {
            continue;
        }

        let OCPTNode::Operator(child_operator) = children.remove(child_index) else {
            unreachable!("flattening requires an operator child");
        };
        children.splice(child_index..child_index, child_operator.children);
        return true;
    }

    false
}

fn check_subtree_independence(children: &[OCPTNode], object_types: &HashSet<String>) -> bool {
    if children.len() < 2 {
        return false;
    }

    for left in 0..children.len() {
        for right in (left + 1)..children.len() {
            if !check_subtree_pair_independence(&children[left], &children[right], object_types) {
                return false;
            }
        }
    }

    true
}

fn check_subtree_pair_independence(
    left: &OCPTNode,
    right: &OCPTNode,
    object_types: &HashSet<String>,
) -> bool {
    let pair = [left, right];
    let left_related = related_types(&[left]);
    let right_related = related_types(&[right]);
    let shared_related: HashSet<String> =
        left_related.intersection(&right_related).cloned().collect();
    let divergent = divergent_or_unrelated(&pair, object_types);
    shared_related.is_subset(&divergent)
}

fn related_types(nodes: &[&OCPTNode]) -> HashSet<String> {
    let mut related = HashSet::new();
    for node in nodes {
        collect_related_types(node, &mut related);
    }
    related
}

fn collect_related_types(node: &OCPTNode, related: &mut HashSet<String>) {
    match node {
        OCPTNode::Leaf(leaf) => related.extend(leaf.related_ob_types.iter().cloned()),
        OCPTNode::Operator(operator) => {
            for child in &operator.children {
                collect_related_types(child, related);
            }
        }
    }
}

fn divergent_or_unrelated(nodes: &[&OCPTNode], object_types: &HashSet<String>) -> HashSet<String> {
    let related = related_types(nodes);
    object_types
        .iter()
        .filter(|object_type| {
            related.contains(*object_type)
                && nodes
                    .iter()
                    .all(|node| is_divergent_or_unrelated(node, object_type))
        })
        .cloned()
        .collect()
}

fn divergent_or_unrelated_one(node: &OCPTNode, object_types: &HashSet<String>) -> HashSet<String> {
    divergent_or_unrelated(&[node], object_types)
}

fn divergent_or_unrelated_slice(
    nodes: &[OCPTNode],
    object_types: &HashSet<String>,
) -> HashSet<String> {
    let nodes: Vec<&OCPTNode> = nodes.iter().collect();
    divergent_or_unrelated(&nodes, object_types)
}

fn is_divergent_or_unrelated(node: &OCPTNode, object_type: &str) -> bool {
    match node {
        OCPTNode::Leaf(leaf) => {
            !leaf.related_ob_types.contains(object_type)
                || leaf.divergent_ob_types.contains(object_type)
        }
        OCPTNode::Operator(operator) => operator
            .children
            .iter()
            .all(|child| is_divergent_or_unrelated(child, object_type)),
    }
}

fn apply_deterministic_ordering(
    children: &mut [OCPTNode],
    operator_kind: NormalFormOperator,
    object_types: &HashSet<String>,
) -> bool {
    match operator_kind {
        NormalFormOperator::Concurrency | NormalFormOperator::ExclusiveChoice => {
            let before: Vec<String> = children.iter().map(structural_key).collect();
            children.sort_by_cached_key(structural_key);
            before
                .iter()
                .zip(children.iter().map(structural_key))
                .any(|(old, new)| old != &new)
        }
        NormalFormOperator::Sequence => {
            let mut changed = false;
            let mut pass_changed = true;

            while pass_changed {
                pass_changed = false;
                for index in 0..children.len().saturating_sub(1) {
                    if check_subtree_pair_independence(
                        &children[index],
                        &children[index + 1],
                        object_types,
                    ) && structural_key(&children[index]) > structural_key(&children[index + 1])
                    {
                        children.swap(index, index + 1);
                        changed = true;
                        pass_changed = true;
                    }
                }
            }

            changed
        }
    }
}

fn apply_ordering_recursively(
    node: &mut OCPTNode,
    object_types: &HashSet<String>,
    applied_rules: &mut Vec<ReductionRule>,
) {
    let OCPTNode::Operator(operator) = node else {
        return;
    };

    for child in &mut operator.children {
        apply_ordering_recursively(child, object_types, applied_rules);
    }

    let operator_kind = NormalFormOperator::from_operator(&operator.operator_type)
        .expect("validation excludes unsupported operators");
    if apply_deterministic_ordering(&mut operator.children, operator_kind, object_types) {
        applied_rules.push(ReductionRule::R6DeterministicOrdering);
    }
}

fn structural_key(node: &OCPTNode) -> String {
    match node {
        OCPTNode::Operator(operator) => {
            let kind = NormalFormOperator::from_operator(&operator.operator_type)
                .expect("validation excludes unsupported operators");
            let children = operator
                .children
                .iter()
                .map(structural_key)
                .map(|key| format!("{}:{key}", key.len()))
                .collect::<String>();
            format!("O{}[{children}]", kind.key())
        }
        OCPTNode::Leaf(leaf) => {
            let OCPTLeafLabel::Activity(activity) = &leaf.activity_label else {
                unreachable!("validation excludes tau leaves");
            };
            format!(
                "L{}:{}R{}D{}C{}F{}",
                activity.len(),
                activity,
                set_key(&leaf.related_ob_types),
                set_key(&leaf.divergent_ob_types),
                set_key(&leaf.convergent_ob_types),
                set_key(&leaf.deficient_ob_types),
            )
        }
    }
}

fn set_key(values: &HashSet<String>) -> String {
    let mut values: Vec<&str> = values.iter().map(String::as_str).collect();
    values.sort_unstable();
    values
        .into_iter()
        .map(|value| format!("{}:{value}", value.len()))
        .collect()
}

#[cfg(test)]

mod tests {
    use super::*;
    use crate::models::ocpt::{IdentityRelation, IdentityRelationKind, OCPTLeaf, OCPTOperator};
    use uuid::Uuid;

    fn set(values: &[&str]) -> HashSet<String> {
        values.iter().map(|value| (*value).to_string()).collect()
    }

    fn leaf(activity: &str, related: &[&str], divergent: &[&str]) -> OCPTNode {
        OCPTNode::Leaf(OCPTLeaf {
            uuid: Uuid::new_v4(),
            activity_label: OCPTLeafLabel::Activity(activity.to_string()),
            related_ob_types: set(related),
            divergent_ob_types: set(divergent),
            convergent_ob_types: HashSet::new(),
            deficient_ob_types: HashSet::new(),
        })
    }

    fn operator(kind: NormalFormOperator, children: Vec<OCPTNode>) -> OCPTNode {
        OCPTNode::Operator(OCPTOperator {
            uuid: Uuid::new_v4(),
            operator_type: kind.into_operator(),
            children,
        })
    }

    fn child_activities(node: &OCPTNode) -> Vec<&str> {
        let OCPTNode::Operator(operator) = node else {
            panic!("expected operator");
        };
        operator
            .children
            .iter()
            .map(|child| {
                let OCPTNode::Leaf(leaf) = child else {
                    panic!("expected leaf child");
                };
                let OCPTLeafLabel::Activity(activity) = &leaf.activity_label else {
                    panic!("expected activity leaf");
                };
                activity.as_str()
            })
            .collect()
    }

    fn assert_operator(node: &OCPTNode, expected: NormalFormOperator, child_count: usize) {
        let OCPTNode::Operator(operator) = node else {
            panic!("expected operator");
        };
        assert_eq!(
            NormalFormOperator::from_operator(&operator.operator_type),
            Some(expected)
        );
        assert_eq!(operator.children.len(), child_count);
    }

    #[test]
    fn r1_flattens_nested_concurrency() {
        let tree = operator(
            NormalFormOperator::Concurrency,
            vec![
                leaf("c", &["x"], &[]),
                operator(
                    NormalFormOperator::Concurrency,
                    vec![leaf("b", &["x"], &[]), leaf("a", &["x"], &[])],
                ),
            ],
        );

        let result = normalize_candidate_tree(tree).unwrap();

        assert_operator(&result.root, NormalFormOperator::Concurrency, 3);
        assert_eq!(child_activities(&result.root), vec!["a", "b", "c"]);
        assert!(
            result
                .applied_rules
                .contains(&ReductionRule::R1ConcurrentAssociativity)
        );
    }

    #[test]
    fn r2_flattens_only_when_divergence_guard_holds() {
        let positive = operator(
            NormalFormOperator::ExclusiveChoice,
            vec![
                operator(
                    NormalFormOperator::ExclusiveChoice,
                    vec![
                        leaf("a", &["x", "z", "a"], &["x"]),
                        leaf("b", &["x", "b"], &["x"]),
                    ],
                ),
                leaf("c", &["z", "c"], &[]),
            ],
        );
        let negative = operator(
            NormalFormOperator::ExclusiveChoice,
            vec![
                operator(
                    NormalFormOperator::ExclusiveChoice,
                    vec![
                        leaf("d", &["x", "d"], &["x"]),
                        leaf("e", &["x", "e"], &["x"]),
                    ],
                ),
                leaf("f", &["x"], &[]),
            ],
        );

        let positive = normalize_candidate_tree(positive).unwrap();
        let negative = normalize_candidate_tree(negative).unwrap();

        assert_operator(&positive.root, NormalFormOperator::ExclusiveChoice, 3);
        assert!(
            positive
                .applied_rules
                .contains(&ReductionRule::R2ChoiceAssociativity)
        );
        assert_operator(&negative.root, NormalFormOperator::ExclusiveChoice, 2);
        assert!(
            !negative
                .applied_rules
                .contains(&ReductionRule::R2ChoiceAssociativity)
        );
    }

    #[test]
    fn r3_flattens_only_when_all_lifted_subtrees_have_matching_divergence() {
        let positive = operator(
            NormalFormOperator::Sequence,
            vec![
                operator(
                    NormalFormOperator::Sequence,
                    vec![
                        leaf("a", &["x", "a"], &["x"]),
                        leaf("b", &["x", "b"], &["x"]),
                    ],
                ),
                leaf("c", &["x"], &[]),
            ],
        );
        let negative = operator(
            NormalFormOperator::Sequence,
            vec![
                operator(
                    NormalFormOperator::Sequence,
                    vec![leaf("d", &["x", "d"], &["x"]), leaf("e", &["x"], &[])],
                ),
                leaf("f", &["x"], &[]),
            ],
        );

        let positive = normalize_candidate_tree(positive).unwrap();
        let negative = normalize_candidate_tree(negative).unwrap();

        assert_operator(&positive.root, NormalFormOperator::Sequence, 3);
        assert!(
            positive
                .applied_rules
                .contains(&ReductionRule::R3SequenceAssociativity)
        );
        assert_operator(&negative.root, NormalFormOperator::Sequence, 2);
        assert!(
            !negative
                .applied_rules
                .contains(&ReductionRule::R3SequenceAssociativity)
        );
    }

    #[test]
    fn r4_can_enable_r1_at_the_parent() {
        let tree = operator(
            NormalFormOperator::Concurrency,
            vec![
                operator(
                    NormalFormOperator::Sequence,
                    vec![leaf("b", &["b"], &[]), leaf("a", &["a"], &[])],
                ),
                leaf("c", &["c"], &[]),
            ],
        );

        let result = normalize_candidate_tree(tree).unwrap();

        assert_operator(&result.root, NormalFormOperator::Concurrency, 3);
        assert!(result.applied_rules.windows(2).any(|rules| rules
            == [
                ReductionRule::R4IndependentSubtrees,
                ReductionRule::R1ConcurrentAssociativity
            ]));
    }

    #[test]
    fn r4_changes_an_independent_root_to_concurrency() {
        let tree = operator(
            NormalFormOperator::ExclusiveChoice,
            vec![leaf("b", &["b"], &[]), leaf("a", &["a"], &[])],
        );

        let result = normalize_candidate_tree(tree).unwrap();

        assert_operator(&result.root, NormalFormOperator::Concurrency, 2);
        assert_eq!(child_activities(&result.root), vec!["a", "b"]);
        assert!(
            result
                .applied_rules
                .contains(&ReductionRule::R4IndependentSubtrees)
        );
    }

    #[test]
    fn r5_removes_unary_operators_recursively() {
        let tree = operator(
            NormalFormOperator::Sequence,
            vec![operator(
                NormalFormOperator::Concurrency,
                vec![leaf("a", &["x"], &[])],
            )],
        );

        let result = normalize_candidate_tree(tree).unwrap();

        assert!(matches!(result.root, OCPTNode::Leaf(_)));
        assert_eq!(
            result
                .applied_rules
                .iter()
                .filter(|rule| **rule == ReductionRule::R5RemoveUnaryOperator)
                .count(),
            2
        );
    }

    #[test]
    fn r6_orders_commutative_children_deterministically() {
        let tree = operator(
            NormalFormOperator::Concurrency,
            vec![
                leaf("c", &["x"], &[]),
                leaf("a", &["x"], &[]),
                leaf("b", &["x"], &[]),
            ],
        );

        let result = normalize_candidate_tree(tree).unwrap();

        assert_eq!(child_activities(&result.root), vec!["a", "b", "c"]);
        assert!(
            result
                .applied_rules
                .contains(&ReductionRule::R6DeterministicOrdering)
        );
    }

    #[test]
    fn r6_only_swaps_independent_adjacent_sequence_children() {
        let tree = operator(
            NormalFormOperator::Sequence,
            vec![
                leaf("b", &["x"], &[]),
                leaf("a", &["y"], &[]),
                leaf("c", &["x"], &[]),
            ],
        );

        let result = normalize_candidate_tree(tree).unwrap();

        assert_operator(&result.root, NormalFormOperator::Sequence, 3);
        assert_eq!(child_activities(&result.root), vec!["a", "b", "c"]);
        assert!(
            result
                .applied_rules
                .contains(&ReductionRule::R6DeterministicOrdering)
        );
    }

    #[test]
    fn validation_rejects_unsupported_structures() {
        let loop_tree = OCPTNode::Operator(OCPTOperator {
            uuid: Uuid::new_v4(),
            operator_type: OCPTOperatorType::Loop(None),
            children: vec![leaf("a", &["x"], &[]), leaf("b", &["x"], &[])],
        });
        let relation = IdentityRelation {
            left: vec!["x".to_string()],
            right: vec!["y".to_string()],
            kind: IdentityRelationKind::Sync,
        };
        let identity_tree =
            OCPTNode::Operator(OCPTOperator::new_identity(relation, leaf("c", &["x"], &[])));
        let tau = OCPTNode::Leaf(OCPTLeaf::new(None));

        assert!(matches!(
            normalize_candidate_tree(loop_tree),
            Err(NormalizationError::LoopOperator)
        ));
        assert!(matches!(
            normalize_candidate_tree(identity_tree),
            Err(NormalizationError::IdentityRelationOperator)
        ));
        assert!(matches!(
            normalize_candidate_tree(tau),
            Err(NormalizationError::TauLeaf)
        ));
    }

    #[test]
    fn validation_rejects_invalid_leaf_metadata_and_duplicate_labels() {
        let all_divergent = leaf("a", &["x"], &["x"]);
        let duplicate = operator(
            NormalFormOperator::Concurrency,
            vec![leaf("b", &["x"], &[]), leaf("b", &["y"], &[])],
        );
        let mut invalid_divergence = leaf("c", &["x"], &[]);
        let OCPTNode::Leaf(leaf) = &mut invalid_divergence else {
            unreachable!();
        };
        leaf.divergent_ob_types.insert("y".to_string());

        assert!(matches!(
            normalize_candidate_tree(all_divergent),
            Err(NormalizationError::NoNonDivergentRelatedType(activity)) if activity == "a"
        ));
        assert!(matches!(
            normalize_candidate_tree(duplicate),
            Err(NormalizationError::DuplicateActivityLabel(activity)) if activity == "b"
        ));
        assert!(matches!(
            normalize_candidate_tree(invalid_divergence),
            Err(NormalizationError::DivergentTypesNotRelated(activity)) if activity == "c"
        ));
    }

    #[test]
    fn validation_rejects_empty_operators_and_non_related_leaf_type_sets() {
        let empty = operator(NormalFormOperator::Sequence, Vec::new());
        let mut invalid_convergence = leaf("a", &["x"], &[]);
        let OCPTNode::Leaf(convergence_leaf) = &mut invalid_convergence else {
            unreachable!();
        };
        convergence_leaf.convergent_ob_types.insert("y".to_string());
        let mut invalid_deficiency = leaf("b", &["x"], &[]);
        let OCPTNode::Leaf(deficiency_leaf) = &mut invalid_deficiency else {
            unreachable!();
        };
        deficiency_leaf.deficient_ob_types.insert("y".to_string());

        assert!(matches!(
            normalize_candidate_tree(empty),
            Err(NormalizationError::EmptyOperator)
        ));
        assert!(matches!(
            normalize_candidate_tree(invalid_convergence),
            Err(NormalizationError::ConvergentTypesNotRelated(activity)) if activity == "a"
        ));
        assert!(matches!(
            normalize_candidate_tree(invalid_deficiency),
            Err(NormalizationError::DeficientTypesNotRelated(activity)) if activity == "b"
        ));
    }

    #[test]
    fn normalization_is_uuid_and_hashset_order_independent() {
        let first = operator(
            NormalFormOperator::Concurrency,
            vec![leaf("b", &["y", "x"], &[]), leaf("a", &["x"], &[])],
        );
        let second = operator(
            NormalFormOperator::Concurrency,
            vec![leaf("a", &["x"], &[]), leaf("b", &["x", "y"], &[])],
        );

        let first = normalize_candidate_tree(first).unwrap();
        let second = normalize_candidate_tree(second).unwrap();

        assert_eq!(structural_key(&first.root), structural_key(&second.root));
    }

    #[test]
    fn normalization_preserves_uuids_of_retained_nodes() {
        let left = leaf("b", &["x"], &[]);
        let right = leaf("a", &["x"], &[]);
        let left_uuid = *left.get_uuid();
        let right_uuid = *right.get_uuid();
        let tree = operator(NormalFormOperator::Concurrency, vec![left, right]);
        let root_uuid = *tree.get_uuid();

        let result = normalize_candidate_tree(tree).unwrap();
        let OCPTNode::Operator(operator) = &result.root else {
            panic!("expected operator");
        };
        let child_uuids: HashSet<Uuid> = operator
            .children
            .iter()
            .map(|child| *child.get_uuid())
            .collect();

        assert_eq!(operator.uuid, root_uuid);
        assert_eq!(child_uuids, HashSet::from([left_uuid, right_uuid]));
    }

    #[test]
    fn normalization_is_idempotent() {
        let tree = operator(
            NormalFormOperator::Concurrency,
            vec![
                operator(
                    NormalFormOperator::Concurrency,
                    vec![leaf("c", &["x"], &[]), leaf("a", &["x"], &[])],
                ),
                leaf("b", &["x"], &[]),
            ],
        );

        let first = normalize_candidate_tree(tree).unwrap();
        let first_key = structural_key(&first.root);
        let second = normalize_candidate_tree(first.root).unwrap();

        assert_eq!(first_key, structural_key(&second.root));
        assert!(second.applied_rules.is_empty());
    }

    #[test]
    fn equivalent_reducible_trees_reach_the_same_normal_form() {
        let nested = operator(
            NormalFormOperator::Concurrency,
            vec![
                leaf("c", &["x"], &[]),
                operator(
                    NormalFormOperator::Concurrency,
                    vec![leaf("a", &["x"], &[]), leaf("b", &["x"], &[])],
                ),
            ],
        );
        let flat = operator(
            NormalFormOperator::Concurrency,
            vec![
                leaf("b", &["x"], &[]),
                leaf("c", &["x"], &[]),
                leaf("a", &["x"], &[]),
            ],
        );

        let nested = normalize_candidate_tree(nested).unwrap();
        let flat = normalize_candidate_tree(flat).unwrap();

        assert_eq!(structural_key(&nested.root), structural_key(&flat.root));
    }
}
