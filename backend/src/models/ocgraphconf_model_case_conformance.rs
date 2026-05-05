use crate::models::ocgraphconf_case_compare::CaseAlignmentDetails;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct OcgraphconfModelCaseConformanceRequest {
    pub case_ocels_file_id: String,
    pub case_index: usize,
    #[serde(default)]
    pub include_alignment_details: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct OcgraphconfModelCaseConformanceResponse {
    pub model_kind: String,
    pub model_file_id: String,
    pub case_ocels_file_id: String,
    pub case_index: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub origin_file_id_ocel: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub case_notion_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub object_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub case_notion_file_id: Option<String>,
    pub alignment_cost: f64,
    pub fitness: f64,
    pub precision: Option<f64>,
    pub case_nodes: usize,
    pub case_edges: usize,
    pub model_case_nodes: usize,
    pub model_case_edges: usize,
    pub case_size: usize,
    pub model_case_size: usize,
    pub matched_node_count: usize,
    pub matched_edge_count: usize,
    pub case_unmatched_node_count: usize,
    pub model_case_unmatched_node_count: usize,
    pub case_unmatched_edge_count: usize,
    pub model_case_unmatched_edge_count: usize,
    pub void_node_count: usize,
    pub void_edge_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alignment_details: Option<CaseAlignmentDetails>,
}
