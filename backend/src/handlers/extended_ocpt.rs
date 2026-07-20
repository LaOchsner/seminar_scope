use crate::core::identity_relations::get_best_extended_ocpt;
use crate::core::struct_converters::ocpt_frontend_backend::backend_to_frontend;
use crate::core::utils::relations::build_relations_from_ocels;
use crate::handlers::ocpt::ensure_temp_dir;
use crate::models::ocel::OCEL;
use crate::models::ocel_collection::OCELCollection;
use crate::models::ocpt::OCPT;
use crate::traits::import_export::ImportableFromPath;
use axum::extract::{Path, Query};
use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::io::ErrorKind;
use tokio::fs;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ExtendOcptQuery {
    pub ocel_id: Option<String>,
    pub noise_threshold: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
struct ExtendedOcptMetadata {
    candidate_tree_count: usize,
}

fn extended_ocpt_metadata_path(file_id: &str) -> String {
    format!("./temp/extended_ocpt_{file_id}.metadata.json")
}

async fn load_source_ocels(ocel_id: &str) -> Result<Vec<OCEL>, (StatusCode, String)> {
    match OCEL::import_from_path(ocel_id).await {
        Ok(ocel) => Ok(vec![ocel]),
        Err(ocel_err) => match OCELCollection::import_from_path(ocel_id).await {
            Ok(collection) => Ok(collection.ocels),
            Err(collection_err) => Err((
                collection_err.0,
                format!(
                    "Failed to load OCEL source '{}'. OCEL error: {}; OCEL collection error: {}",
                    ocel_id, ocel_err.1, collection_err.1
                ),
            )),
        },
    }
}

async fn persist_extended_ocpt(
    ocpt: &OCPT,
    candidate_tree_count: usize,
) -> Result<String, (StatusCode, String)> {
    ensure_temp_dir().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to prepare storage: {e}"),
        )
    })?;

    let file_id = Uuid::new_v4().to_string();
    let path = format!("./temp/extended_ocpt_{}.json", file_id);
    let pretty = serde_json::to_string_pretty(ocpt).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Serialize extended OCPT failed: {e}"),
        )
    })?;
    fs::write(&path, pretty).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to save extended OCPT: {e}"),
        )
    })?;

    let metadata = ExtendedOcptMetadata {
        candidate_tree_count,
    };
    let metadata_path = extended_ocpt_metadata_path(&file_id);
    let pretty_metadata = serde_json::to_string_pretty(&metadata).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Serialize extended OCPT metadata failed: {e}"),
        )
    })?;
    fs::write(&metadata_path, pretty_metadata)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to save extended OCPT metadata: {e}"),
            )
        })?;

    Ok(file_id)
}

pub async fn apply_extended_ocpt(
    Path(ocpt_id): Path<String>,
    Query(query): Query<ExtendOcptQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let noise_threshold = query.noise_threshold.unwrap_or(0.0);
    if !noise_threshold.is_finite() || !(0.0..=1.0).contains(&noise_threshold) {
        return Err((
            StatusCode::BAD_REQUEST,
            "noise_threshold must be a finite number between 0.0 and 1.0".to_string(),
        ));
    }
    // External semantics follow the paper's adherence/support threshold:
    // - noise_threshold=1.0 => no violations allowed (strict)
    // - noise_threshold=0.0 => all violations allowed
    let violation_threshold = 1.0 - noise_threshold;

    let ocel_id = query.ocel_id.ok_or((
        StatusCode::BAD_REQUEST,
        "Missing required query parameter: ocel_id".to_string(),
    ))?;
    let ocel_id = ocel_id.trim();
    if ocel_id.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "ocel_id cannot be empty".to_string(),
        ));
    }

    let mut ocpt = OCPT::import_from_path(&ocpt_id).await?;

    if !ocpt.is_valid() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Source OCPT is invalid".to_string(),
        ));
    }

    let source_ocels = load_source_ocels(ocel_id).await?;
    let relations = build_relations_from_ocels(&source_ocels);
    let selection =
        get_best_extended_ocpt(ocpt.root, &relations, violation_threshold).map_err(|err| {
            (
                StatusCode::BAD_REQUEST,
                format!("Failed to generate candidate trees: {err}"),
            )
        })?;
    let candidate_tree_count = selection.candidate_tree_count;
    ocpt.root = selection.root;

    let new_file_id = persist_extended_ocpt(&ocpt, candidate_tree_count).await?;
    let payload = json!({
        "file_id": new_file_id,
        "extended_ocpt": backend_to_frontend(&ocpt),
        "candidate_tree_count": candidate_tree_count
    });

    Ok(Json(payload))
}

pub async fn get_extended_ocpt(Path(file_id): Path<String>) -> impl IntoResponse {
    let path = format!("./temp/extended_ocpt_{}.json", file_id);
    match OCPT::from_json_file(&path).await {
        Ok(backend_ocpt) => {
            let candidate_tree_count = fs::read_to_string(extended_ocpt_metadata_path(&file_id))
                .await
                .ok()
                .and_then(|metadata| serde_json::from_str::<ExtendedOcptMetadata>(&metadata).ok())
                .map(|metadata| metadata.candidate_tree_count)
                .unwrap_or(1);

            (
                StatusCode::OK,
                Json(json!({
                    "file_id": file_id,
                    "extended_ocpt": backend_to_frontend(&backend_ocpt),
                    "candidate_tree_count": candidate_tree_count
                })),
            )
                .into_response()
        }
        Err((status, message)) => (status, message).into_response(),
    }
}

pub async fn delete_extended_ocpt(Path(file_id): Path<String>) -> impl IntoResponse {
    let path = format!("./temp/extended_ocpt_{}.json", file_id);
    match fs::remove_file(&path).await {
        Ok(_) => {
            let _ = fs::remove_file(extended_ocpt_metadata_path(&file_id)).await;
            (StatusCode::NO_CONTENT, "Deleted file").into_response()
        }
        Err(e) if e.kind() == ErrorKind::NotFound => (
            StatusCode::NOT_FOUND,
            format!("Extended OCPT file not found for file_id: {}", file_id),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to delete extended OCPT: {}", e),
        )
            .into_response(),
    }
}
