use crate::models::ocpt::{OCPTLeafLabel, OCPTNode, OCPTOperator, OCPTOperatorType};

/// Candidate-tree generation via normal-form transformation rules.
///
/// This is a coarse template that enumerates language-equivalent OCPT variants
/// by applying a set of local rewrite rules (R1-R6). The concrete rewrite
/// conditions should follow the paper's definitions for divergence and
/// relatedness checks.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReductionRule {
	R1ConcurrentAssociativity,
	R2ChoiceAssociativity,
	R3SequenceAssociativity,
	R4IndependentSubtrees,
	R5RemoveUnaryOperator,
	R6DeterministicOrdering,
}

#[derive(Debug, Clone)]
pub struct CandidateTreeResult {
	pub root: OCPTNode,
	pub applied_rules: Vec<ReductionRule>,
}

#[derive(Debug, Clone, Default)]
pub struct CandidateConfig {
	pub max_passes: usize,
	pub max_candidates: usize,
}

impl CandidateConfig {
	pub fn bounded(max_candidates: usize) -> Self {
		Self {
			max_passes: 8,
			max_candidates,
		}
	}
}

/// Entry point used by the extended OCPT pipeline.
///
/// Returns a list of candidate trees (including the original tree) with a
/// record of which reduction rules were applied.
pub fn generate_candidate_trees(
	root: OCPTNode,
	config: CandidateConfig,
) -> Vec<CandidateTreeResult> {
	let mut results = Vec::new();
	results.push(CandidateTreeResult {
		root: root.clone(),
		applied_rules: Vec::new(),
	});

	let mut frontier = vec![root];
	let mut passes = 0usize;

	while !frontier.is_empty()
		&& results.len() < config.max_candidates
		&& passes < config.max_passes
	{
		passes += 1;
		let mut next_frontier = Vec::new();

		for tree in frontier {
			let rewrites = apply_one_pass(tree);
			for (candidate, applied) in rewrites {
				results.push(CandidateTreeResult {
					root: candidate.clone(),
					applied_rules: applied,
				});
				next_frontier.push(candidate);

				if results.len() >= config.max_candidates {
					break;
				}
			}
			if results.len() >= config.max_candidates {
				break;
			}
		}

		frontier = next_frontier;
	}

	results
}

/// Applies one breadth pass of rewrite rules to a tree.
///
/// Each returned tuple is a new candidate plus the list of rules that produced it.
fn apply_one_pass(root: OCPTNode) -> Vec<(OCPTNode, Vec<ReductionRule>)> {
	let mut out = Vec::new();

	// R5: remove unary operators (placeholder).
	if let Some(rewrite) = rule_remove_unary_operator(&root) {
		out.push((rewrite, vec![ReductionRule::R5RemoveUnaryOperator]));
	}

	// R1, R2, R3, R4, R6 (placeholders).
	// These should traverse the tree and apply localized rewrites where conditions hold.
	if let Some(rewrite) = rule_concurrent_associativity(&root) {
		out.push((rewrite, vec![ReductionRule::R1ConcurrentAssociativity]));
	}
	if let Some(rewrite) = rule_choice_associativity(&root) {
		out.push((rewrite, vec![ReductionRule::R2ChoiceAssociativity]));
	}
	if let Some(rewrite) = rule_sequence_associativity(&root) {
		out.push((rewrite, vec![ReductionRule::R3SequenceAssociativity]));
	}
	if let Some(rewrite) = rule_independent_subtrees(&root) {
		out.push((rewrite, vec![ReductionRule::R4IndependentSubtrees]));
	}
	if let Some(rewrite) = rule_deterministic_ordering(&root) {
		out.push((rewrite, vec![ReductionRule::R6DeterministicOrdering]));
	}

	out
}

/// R1: Concurrent operator associativity.
fn rule_concurrent_associativity(root: &OCPTNode) -> Option<OCPTNode> {
	let _ = root;
	None
}

/// R2: Exclusive choice operator associativity, guarded by divergence checks.
fn rule_choice_associativity(root: &OCPTNode) -> Option<OCPTNode> {
	let _ = root;
	None
}

/// R3: Sequence operator associativity, guarded by divergence checks.
fn rule_sequence_associativity(root: &OCPTNode) -> Option<OCPTNode> {
	let _ = root;
	None
}

/// R4: Reduction of independent subtrees (operator choice depends on parent).
fn rule_independent_subtrees(root: &OCPTNode) -> Option<OCPTNode> {
	let _ = root;
	None
}

/// R5: Remove redundant unary operator nodes.
fn rule_remove_unary_operator(root: &OCPTNode) -> Option<OCPTNode> {
	match root {
		OCPTNode::Operator(op) if op.children.len() == 1 => Some(op.children[0].clone()),
		_ => None,
	}
}

/// R6: Deterministic subtree ordering for commutative operators.
fn rule_deterministic_ordering(root: &OCPTNode) -> Option<OCPTNode> {
	let _ = root;
	None
}

// --- helper stubs for future rule conditions ---

#[allow(dead_code)]
fn is_commutative_operator(op: &OCPTOperatorType) -> bool {
	matches!(op, OCPTOperatorType::Concurrency | OCPTOperatorType::ExclusiveChoice)
}

#[allow(dead_code)]
fn leaf_activity_label(node: &OCPTNode) -> Option<&str> {
	match node {
		OCPTNode::Leaf(leaf) => match &leaf.activity_label {
			OCPTLeafLabel::Activity(activity) => Some(activity.as_str()),
			OCPTLeafLabel::Tau => None,
		},
		OCPTNode::Operator(_) => None,
	}
}
