use axum::{Json, extract::Path as AxumPath, http::StatusCode, response::IntoResponse};
use serde_json::json;
use tokio::fs as tokio_fs;

use process_mining::object_centric::conformance::object_centric_language_abstraction_struct::{
    OCLanguageAbstraction, compute_fitness_precision,
};
use process_mining::object_centric::ocpt::object_centric_process_tree_struct::{
    OCPT as ProcessMiningOCPT, OCPTLeaf as ProcessMiningOCPTLeaf,
    OCPTLeafLabel as ProcessMiningOCPTLeafLabel, OCPTNode as ProcessMiningOCPTNode,
    OCPTOperator as ProcessMiningOCPTOperator, OCPTOperatorType as ProcessMiningOCPTOperatorType,
};
use crate::models::ocel::{IndexLinkedOCEL, OCEL};

// OCPT backend + (optionally) FE type & converter if needed
use crate::core::struct_converters::ocpt_frontend_backend::frontend_to_backend;
use crate::models::ocpt::{
    OCPT as BackendOCPT, OCPTLeaf as BackendOCPTLeaf, OCPTLeafLabel as BackendOCPTLeafLabel,
    OCPTNode as BackendOCPTNode, OCPTOperator as BackendOCPTOperator,
    OCPTOperatorType as BackendOCPTOperatorType, OcptFE as FrontendOcpt,
};

/// Helper: Load an OCPT from disk, accepting either FE or BE JSON.
/// Always returns the **backend** OCPT.
async fn load_backend_ocpt(path: &str) -> Result<ProcessMiningOCPT, String> {
    let content = tokio_fs::read_to_string(path)
        .await
        .map_err(|e| format!("read {}: {e}", path))?;

    // Try backend first
    let backend_ocpt = if let Ok(be) = serde_json::from_str::<BackendOCPT>(&content) {
        be
    } else {
        // Try frontend -> convert to backend
        let fe = serde_json::from_str::<FrontendOcpt>(&content)
            .map_err(|e| format!("parse OCPT (backend or frontend) failed at {}: {e}", path))?;

        frontend_to_backend(fe)
            .map_err(|e| format!("frontend->backend OCPT conversion failed at {}: {e}", path))?
    };

    Ok(to_process_mining_ocpt(backend_ocpt))
}

fn to_process_mining_ocpt(ocpt: BackendOCPT) -> ProcessMiningOCPT {
    ProcessMiningOCPT {
        root: to_process_mining_node(ocpt.root),
    }
}

fn to_process_mining_node(node: BackendOCPTNode) -> ProcessMiningOCPTNode {
    match node {
        BackendOCPTNode::Operator(op) => {
            ProcessMiningOCPTNode::Operator(to_process_mining_operator(op))
        }
        BackendOCPTNode::Leaf(leaf) => ProcessMiningOCPTNode::Leaf(to_process_mining_leaf(leaf)),
    }
}

fn to_process_mining_operator(op: BackendOCPTOperator) -> ProcessMiningOCPTOperator {
    ProcessMiningOCPTOperator {
        uuid: op.uuid,
        operator_type: to_process_mining_operator_type(op.operator_type),
        children: op
            .children
            .into_iter()
            .map(to_process_mining_node)
            .collect(),
    }
}

fn to_process_mining_operator_type(
    operator_type: BackendOCPTOperatorType,
) -> ProcessMiningOCPTOperatorType {
    match operator_type {
        BackendOCPTOperatorType::Sequence => ProcessMiningOCPTOperatorType::Sequence,
        BackendOCPTOperatorType::ExclusiveChoice => ProcessMiningOCPTOperatorType::ExclusiveChoice,
        BackendOCPTOperatorType::Concurrency => ProcessMiningOCPTOperatorType::Concurrency,
        BackendOCPTOperatorType::Loop(count) => ProcessMiningOCPTOperatorType::Loop(count),
    }
}

fn to_process_mining_leaf(leaf: BackendOCPTLeaf) -> ProcessMiningOCPTLeaf {
    ProcessMiningOCPTLeaf {
        uuid: leaf.uuid,
        activity_label: to_process_mining_leaf_label(leaf.activity_label),
        related_ob_types: leaf.related_ob_types,
        divergent_ob_types: leaf.divergent_ob_types,
        convergent_ob_types: leaf.convergent_ob_types,
        deficient_ob_types: leaf.deficient_ob_types,
    }
}

fn to_process_mining_leaf_label(label: BackendOCPTLeafLabel) -> ProcessMiningOCPTLeafLabel {
    match label {
        BackendOCPTLeafLabel::Activity(label) => ProcessMiningOCPTLeafLabel::Activity(label),
        BackendOCPTLeafLabel::Tau => ProcessMiningOCPTLeafLabel::Tau,
    }
}

/// GET /v1/conformance/ocpt/{ocpt_id}/ocel/{ocel_id}"
/// -> loads ./temp/ocpt_{ocpt_id}.json and (./temp/ocel_v2_{ocel_id}.json || ./temp/ocel_{ocel_id}.json)
pub async fn get_conformance_ocpt_ocel(
    AxumPath((ocpt_id, ocel_id)): AxumPath<(String, String)>,
) -> impl IntoResponse {
    // OCPT path (model)
    let ocpt_path = format!("./temp/ocpt_{}.json", ocpt_id);

    // OCEL path (log): prefer v2, fall back to plain
    let ocel_v2_path = format!("./temp/ocel_v2_{}.json", ocel_id);
    let ocel_plain_path = format!("./temp/ocel_{}.json", ocel_id);

    // --- Load OCPT (FE or BE) ---
    let ocpt_backend = match load_backend_ocpt(&ocpt_path).await {
        Ok(x) => x,
        Err(e) => return (StatusCode::BAD_REQUEST, e).into_response(),
    };

    // --- Load OCEL (prefer v2) ---
    let ocel_data = match tokio_fs::read_to_string(&ocel_v2_path).await {
        Ok(s) => s,
        Err(_) => match tokio_fs::read_to_string(&ocel_plain_path).await {
            Ok(s) => s,
            Err(e2) => {
                return (
                    StatusCode::NOT_FOUND,
                    format!(
                        "OCEL not found. Tried:\n  {}\n  {}\nError: {}",
                        ocel_v2_path, ocel_plain_path, e2
                    ),
                )
                    .into_response();
            }
        },
    };

    let ocel_struct: OCEL = match serde_json::from_str(&ocel_data) {
        Ok(o) => o,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                format!(
                    "Failed to parse OCEL JSON ({} or {}): {}",
                    ocel_v2_path, ocel_plain_path, e
                ),
            )
                .into_response();
        }
    };

    // --- Conformance ---
    let locel: IndexLinkedOCEL = IndexLinkedOCEL::from_ocel(ocel_struct);
    let model_abs = OCLanguageAbstraction::create_from_oc_process_tree(&ocpt_backend);
    let log_abs = OCLanguageAbstraction::create_from_ocel(&locel);
    let (fitness, precision) = compute_fitness_precision(&log_abs, &model_abs);

    Json(json!({
        "fitness": fitness,
        "precision": precision
    }))
    .into_response()
}

/// GET /v1/conformance/ocpt_1/{ocpt_id_1}/ocpt_2/{ocpt_id_2}
/// -> loads ./temp/ocpt_{ocpt_id_1}.json and ./temp/ocpt_{ocpt_id_2}.json
pub async fn get_conformance_ocpt_ocpt(
    AxumPath((ocpt_id_1, ocpt_id_2)): AxumPath<(String, String)>,
) -> impl IntoResponse {
    let ocpt_1_path = format!("./temp/ocpt_{}.json", ocpt_id_1);
    let ocpt_2_path = format!("./temp/ocpt_{}.json", ocpt_id_2);

    let ocpt_1 = match load_backend_ocpt(&ocpt_1_path).await {
        Ok(x) => x,
        Err(e) => return (StatusCode::BAD_REQUEST, e).into_response(),
    };
    let ocpt_2 = match load_backend_ocpt(&ocpt_2_path).await {
        Ok(x) => x,
        Err(e) => return (StatusCode::BAD_REQUEST, e).into_response(),
    };

    let a_abs = OCLanguageAbstraction::create_from_oc_process_tree(&ocpt_1);
    let b_abs = OCLanguageAbstraction::create_from_oc_process_tree(&ocpt_2);
    let (fitness, precision) = compute_fitness_precision(&a_abs, &b_abs);

    Json(json!({
        "fitness": fitness,
        "precision": precision
    }))
    .into_response()
}
