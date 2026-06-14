use crate::core::ocgraphconf_case_compare::convert::{
    CaseEdge, CaseEdgeType, CaseGraph, CaseNode, CaseNodeKind,
};
use crate::models::ocgraphconf_case_compare::{EdgeMatch, NodeMatch};
use axum::http::StatusCode;
use ocgraphconf_process_mining::oc_case::case::{
    CaseGraph as SolverCaseGraph, Edge as SolverEdge, EdgeType as SolverEdgeType,
    Event as SolverEvent, Node as SolverNode, Object as SolverObject,
};
use ocgraphconf_process_mining::oc_conformance_checking::case_assignment::{
    CaseAssignment, EdgeMapping as SolverEdgeMapping, NodeMapping as SolverNodeMapping,
};
use std::any::Any;
use std::collections::BTreeSet;
use std::panic::{AssertUnwindSafe, catch_unwind};

#[derive(Debug, Clone)]
pub struct AlignmentResult {
    pub matched_nodes: Vec<NodeMatch>,
    pub matched_edges: Vec<EdgeMatch>,
    pub left_unmatched_node_ids: Vec<usize>,
    pub right_unmatched_node_ids: Vec<usize>,
    pub left_unmatched_edge_ids: Vec<usize>,
    pub right_unmatched_edge_ids: Vec<usize>,
    pub alignment_cost: f64,
}

pub fn compare_case_graphs(
    left: &CaseGraph,
    right: &CaseGraph,
) -> Result<AlignmentResult, (StatusCode, String)> {
    let solver_left = to_solver_case_graph(left);
    let solver_right = to_solver_case_graph(right);
    // ocgraphconf may panic internally on solver/model issues; surface that as a normal 500 response.
    let assignment = catch_unwind(AssertUnwindSafe(|| {
        CaseAssignment::compute_assignment_mip(&solver_left, &solver_right)
    }))
    .map_err(|panic_payload| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!(
                "ocgraphconf case-assignment solver failed: {}",
                panic_message(&panic_payload)
            ),
        )
    })?;

    let alignment_cost = assignment.total_cost().map_err(|message| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!(
                "ocgraphconf case-assignment solver returned an invalid alignment: {}",
                message
            ),
        )
    })?;

    let mut matched_nodes = Vec::new();
    let mut matched_edges = Vec::new();
    let mut left_unmatched_node_ids = Vec::new();
    let mut left_unmatched_edge_ids = Vec::new();
    let mut matched_right_node_ids = BTreeSet::new();
    let mut matched_right_edge_ids = BTreeSet::new();

    // The solver records left-side insertions directly; right-side misses are derived from unmatched IDs.
    for mapping in assignment.node_mapping.values() {
        match mapping {
            SolverNodeMapping::RealNode(left_node_id, right_node_id) => {
                matched_nodes.push(NodeMatch {
                    left_node_id: *left_node_id,
                    right_node_id: *right_node_id,
                });
                matched_right_node_ids.insert(*right_node_id);
            }
            SolverNodeMapping::InsertedNode(left_node_id, _) => {
                left_unmatched_node_ids.push(*left_node_id);
            }
        }
    }

    for mapping in assignment.edge_mapping.values() {
        match mapping {
            SolverEdgeMapping::RealEdge(left_edge_id, right_edge_id) => {
                matched_edges.push(EdgeMatch {
                    left_edge_id: *left_edge_id,
                    right_edge_id: *right_edge_id,
                });
                matched_right_edge_ids.insert(*right_edge_id);
            }
            SolverEdgeMapping::InsertedEdge(left_edge_id, _) => {
                left_unmatched_edge_ids.push(*left_edge_id);
            }
        }
    }

    matched_nodes.sort();
    matched_edges.sort();
    left_unmatched_node_ids.sort();
    left_unmatched_edge_ids.sort();

    let right_unmatched_node_ids = difference(
        right.nodes.keys().copied().collect(),
        matched_right_node_ids,
    );
    let right_unmatched_edge_ids = difference(
        right.edges.keys().copied().collect(),
        matched_right_edge_ids,
    );

    Ok(AlignmentResult {
        matched_nodes,
        matched_edges,
        left_unmatched_node_ids,
        right_unmatched_node_ids,
        left_unmatched_edge_ids,
        right_unmatched_edge_ids,
        alignment_cost,
    })
}

pub(crate) fn to_solver_case_graph(case_graph: &CaseGraph) -> SolverCaseGraph {
    let mut solver_graph = SolverCaseGraph::new();

    for node in case_graph.nodes.values() {
        let solver_node = match &node.kind {
            CaseNodeKind::Event { event_type, .. } => SolverNode::EventNode(SolverEvent {
                id: node.id,
                event_type: event_type.as_str().into(),
            }),
            CaseNodeKind::Object { object_type, .. } => SolverNode::ObjectNode(SolverObject {
                id: node.id,
                object_type: object_type.as_str().into(),
            }),
        };
        solver_graph.add_node(solver_node);
    }

    for edge in case_graph.edges.values() {
        let edge_type = match edge.edge_type {
            CaseEdgeType::DF => SolverEdgeType::DF,
            CaseEdgeType::E2O => SolverEdgeType::E2O,
        };
        solver_graph.add_edge(SolverEdge::new(edge.id, edge.from, edge.to, edge_type));
    }

    solver_graph
}

pub(crate) fn from_solver_case_graph(
    solver_graph: &SolverCaseGraph,
) -> Result<CaseGraph, (StatusCode, String)> {
    let mut case_graph = CaseGraph::default();

    // Model-case conformance returns a solver graph; rebuild local indexes for shared metric code.
    for node in solver_graph.nodes.values() {
        let (id, kind) = match node {
            SolverNode::EventNode(event) => (
                event.id,
                CaseNodeKind::Event {
                    event_type: event.event_type.to_string(),
                    source_event_id: event.id.to_string(),
                },
            ),
            SolverNode::ObjectNode(object) => (
                object.id,
                CaseNodeKind::Object {
                    object_type: object.object_type.to_string(),
                    source_object_id: object.id.to_string(),
                },
            ),
        };

        case_graph.nodes.insert(id, CaseNode { id, kind });
    }

    let node_summaries = case_graph
        .nodes
        .values()
        .map(|node| (node.id, node.kind.clone()))
        .collect::<Vec<_>>();
    let mut ordered_event_ids = Vec::new();
    for (node_id, node_kind) in node_summaries {
        match node_kind {
            CaseNodeKind::Event { .. } => ordered_event_ids.push(node_id),
            CaseNodeKind::Object { object_type, .. } => {
                case_graph
                    .object_ids_by_type
                    .entry(object_type)
                    .or_default()
                    .push(node_id);
                case_graph
                    .incident_events_by_object
                    .entry(node_id)
                    .or_default();
            }
        }
    }
    ordered_event_ids.sort_unstable();
    case_graph.ordered_event_ids = ordered_event_ids;

    for edge in solver_graph.edges.values() {
        let edge_type = match edge.edge_type {
            SolverEdgeType::DF => CaseEdgeType::DF,
            SolverEdgeType::E2O => CaseEdgeType::E2O,
            SolverEdgeType::O2O => {
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "ocgraphconf returned an unexpected object-to-object edge in the generated case graph"
                        .to_string(),
                ));
            }
        };

        case_graph.edges.insert(
            edge.id,
            CaseEdge {
                id: edge.id,
                from: edge.from,
                to: edge.to,
                edge_type,
            },
        );

        match edge_type {
            CaseEdgeType::DF => {
                case_graph.df_edge_ids.insert((edge.from, edge.to), edge.id);
            }
            CaseEdgeType::E2O => {
                case_graph
                    .e2o_edge_ids
                    .insert((edge.from, edge.to), edge.id);
                case_graph
                    .incident_events_by_object
                    .entry(edge.to)
                    .or_default()
                    .insert(edge.from);
            }
        }
    }

    Ok(case_graph)
}

fn difference(all_ids: BTreeSet<usize>, matched_ids: BTreeSet<usize>) -> Vec<usize> {
    all_ids.difference(&matched_ids).copied().collect()
}

fn panic_message(panic_payload: &Box<dyn Any + Send>) -> String {
    if let Some(message) = panic_payload.downcast_ref::<&str>() {
        (*message).to_string()
    } else if let Some(message) = panic_payload.downcast_ref::<String>() {
        message.clone()
    } else {
        "unknown panic payload".to_string()
    }
}
