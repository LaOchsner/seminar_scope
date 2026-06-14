use crate::core::ocgraphconf_case_compare::compare::AlignmentResult;
use crate::core::ocgraphconf_case_compare::convert::CaseGraph;
use crate::core::ocgraphconf_case_compare::extract::SelectedCases;
use crate::models::ocgraphconf_case_compare::{
    CaseAlignmentDetails, OcgraphconfCaseCompareRequest, OcgraphconfCaseCompareResponse,
};
use axum::http::StatusCode;
use serde_json::Value;
use std::collections::HashMap;

pub fn build_response(
    request: &OcgraphconfCaseCompareRequest,
    selected_cases: &SelectedCases,
    left_graph: &CaseGraph,
    right_graph: &CaseGraph,
    alignment: &AlignmentResult,
) -> Result<OcgraphconfCaseCompareResponse, (StatusCode, String)> {
    let left_case_nodes = left_graph.nodes.len();
    let left_case_edges = left_graph.edges.len();
    let right_case_nodes = right_graph.nodes.len();
    let right_case_edges = right_graph.edges.len();
    let left_case_size = left_case_nodes + left_case_edges;
    let right_case_size = right_case_nodes + right_case_edges;
    // Normalize by both graph sizes so the score remains bounded for asymmetric cases.
    let normalizer = (left_case_size + right_case_size).max(1) as f64;
    let fitness = (1.0 - (alignment.alignment_cost / normalizer)).max(0.0);

    Ok(OcgraphconfCaseCompareResponse {
        case_ocels_file_id: request.case_ocels_file_id.clone(),
        left_case_index: request.left_case_index,
        right_case_index: request.right_case_index,
        origin_file_id_ocel: attr_string(&selected_cases.attributes, "origin_file_id_ocel"),
        case_notion_type: attr_string(&selected_cases.attributes, "case_notion_type"),
        object_type: attr_string(&selected_cases.attributes, "object_type"),
        case_notion_file_id: attr_string(&selected_cases.attributes, "case_notion_file_id"),
        alignment_cost: alignment.alignment_cost,
        fitness,
        precision: None,
        left_case_nodes,
        left_case_edges,
        right_case_nodes,
        right_case_edges,
        left_case_size,
        right_case_size,
        matched_node_count: alignment.matched_nodes.len(),
        matched_edge_count: alignment.matched_edges.len(),
        left_unmatched_node_count: alignment.left_unmatched_node_ids.len(),
        right_unmatched_node_count: alignment.right_unmatched_node_ids.len(),
        left_unmatched_edge_count: alignment.left_unmatched_edge_ids.len(),
        right_unmatched_edge_count: alignment.right_unmatched_edge_ids.len(),
        void_node_count: alignment.left_unmatched_node_ids.len()
            + alignment.right_unmatched_node_ids.len(),
        void_edge_count: alignment.left_unmatched_edge_ids.len()
            + alignment.right_unmatched_edge_ids.len(),
        alignment_details: request
            .include_alignment_details
            .then_some(CaseAlignmentDetails {
                matched_nodes: alignment.matched_nodes.clone(),
                matched_edges: alignment.matched_edges.clone(),
                left_unmatched_node_ids: alignment.left_unmatched_node_ids.clone(),
                right_unmatched_node_ids: alignment.right_unmatched_node_ids.clone(),
                left_unmatched_edge_ids: alignment.left_unmatched_edge_ids.clone(),
                right_unmatched_edge_ids: alignment.right_unmatched_edge_ids.clone(),
            }),
    })
}

fn attr_string(attributes: &HashMap<String, Value>, key: &str) -> Option<String> {
    attributes
        .get(key)
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
}
