use crate::models::ocpt::{OCPTLeafLabel, OCPTNode, OCPTOperatorType};
use serde_json;

/// Candidate-tree generation via normal-form transformation rules.
/// 
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
	let mut frontier = vec![root];

	// Include original tree as the first candidate if we can deep-clone it.
	if let Some(orig_clone) = deep_clone_node(&frontier[0]) {
		results.push(CandidateTreeResult {
			root: orig_clone,
			applied_rules: Vec::new(),
		});
	}
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
				if let Some(candidate_clone) = deep_clone_node(&candidate) {
					results.push(CandidateTreeResult { root: candidate_clone, applied_rules: applied.clone(), });
				}
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

	// R5: remove unary operators
	if let Some(rewrite) = rule_remove_unary_operator(&root) {
		out.push((rewrite, vec![ReductionRule::R5RemoveUnaryOperator]));
	}

	// R1, R2, R3, R4, R6
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
	// Fast-check the condition: only proceed if root is a concurrency operator
	if let OCPTNode::Operator(op) = root {
		if !matches!(op.operator_type, OCPTOperatorType::Concurrency) {
			return None;
		}
	} else {
		return None;
	}

	// Deep-clone whole tree so that owned values can be motified freely
	let mut new_root = match deep_clone_node(root) {
		Some(n) => n,
		None => return None,
	};

	// Flatten nested concurrency operators in the cloned tree.
	if let OCPTNode::Operator(op) = &mut new_root {
		let mut new_children: Vec<OCPTNode> = Vec::new();
		let mut changed = false;

		// Drain children to take ownership
		let old_children = std::mem::take(&mut op.children);
		for child in old_children {
			match child {
				OCPTNode::Operator(child_op) if matches!(child_op.operator_type, OCPTOperatorType::Concurrency) => {
					for gc in child_op.children.into_iter() {
						new_children.push(gc);
					}
					changed = true;
				}
				other => new_children.push(other),
			}
		}

		if changed {
			op.children = new_children;
			return Some(new_root);
		}
	}

	None
}

/// Deep-clone an `OCPTNode` via serde JSON round-trip. Returns `None` on (de)serialization errors.
fn deep_clone_node(node: &OCPTNode) -> Option<OCPTNode> {
	serde_json::to_value(node).ok().and_then(|v| serde_json::from_value(v).ok())
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
		OCPTNode::Operator(op) if op.children.len() == 1 => deep_clone_node(&op.children[0]),
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
