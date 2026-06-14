use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct OcgraphconfCaseCompareRequest {
    pub case_ocels_file_id: String,
    pub left_case_index: usize,
    pub right_case_index: usize,
    #[serde(default)]
    pub include_alignment_details: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct OcgraphconfCaseCompareResponse {
    pub case_ocels_file_id: String,
    pub left_case_index: usize,
    pub right_case_index: usize,
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
    pub left_case_nodes: usize,
    pub left_case_edges: usize,
    pub right_case_nodes: usize,
    pub right_case_edges: usize,
    pub left_case_size: usize,
    pub right_case_size: usize,
    pub matched_node_count: usize,
    pub matched_edge_count: usize,
    pub left_unmatched_node_count: usize,
    pub right_unmatched_node_count: usize,
    pub left_unmatched_edge_count: usize,
    pub right_unmatched_edge_count: usize,
    pub void_node_count: usize,
    pub void_edge_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alignment_details: Option<CaseAlignmentDetails>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CaseAlignmentDetails {
    pub matched_nodes: Vec<NodeMatch>,
    pub matched_edges: Vec<EdgeMatch>,
    pub left_unmatched_node_ids: Vec<usize>,
    pub right_unmatched_node_ids: Vec<usize>,
    pub left_unmatched_edge_ids: Vec<usize>,
    pub right_unmatched_edge_ids: Vec<usize>,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize)]
pub struct NodeMatch {
    pub left_node_id: usize,
    pub right_node_id: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize)]
pub struct EdgeMatch {
    pub left_edge_id: usize,
    pub right_edge_id: usize,
}
