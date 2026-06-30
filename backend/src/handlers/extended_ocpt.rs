use crate::core::eocpn_conversion::{
    ConvertOcptToEocpnError, convert_eocpt_to_eocpn_with_supported_identities,
};
use crate::core::identity_relations::get_best_extended_ocpt;
use crate::core::struct_converters::ocpt_frontend_backend::backend_to_frontend;
use crate::core::utils::relations::build_relations_from_ocels;
use crate::handlers::ocpt::ensure_temp_dir;
use crate::models::eocpn::EOCPN;
use crate::models::ocel::OCEL;
use crate::models::ocel_collection::OCELCollection;
use crate::models::ocpt::OCPT;
use crate::traits::import_export::{ExportableToPath, ImportableFromPath};
use axum::extract::{Path, Query};
use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::Deserialize;
use serde_json::json;
use std::io::ErrorKind;
use tokio::fs;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ExtendOcptQuery {
    pub ocel_id: Option<String>,
    pub noise_threshold: Option<f64>,
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

async fn persist_extended_ocpt(ocpt: &OCPT) -> Result<String, (StatusCode, String)> {
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

    Ok(file_id)
}

async fn persist_eocpn_from_extended_ocpt(
    ocpt: &OCPT,
) -> Result<(String, EOCPN), (StatusCode, String)> {
    if !ocpt.is_valid() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Source extended OCPT is invalid".to_string(),
        ));
    }

    let eocpn =
        convert_eocpt_to_eocpn_with_supported_identities(ocpt).map_err(map_eocpn_convert_error)?;
    let file_id = eocpn.export_to_path().await?;
    Ok((file_id, eocpn))
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
    // External semantics:
    // - noise_threshold=1.0 => no noise allowed (strict)
    // - noise_threshold=0.0 => all noise allowed
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
    ocpt.root = selection.root;

    let new_file_id = persist_extended_ocpt(&ocpt).await?;
    let (eocpn_file_id, eocpn) = persist_eocpn_from_extended_ocpt(&ocpt).await?;
    let payload = json!({
        "file_id": new_file_id,
        "eocpn_file_id": eocpn_file_id,
        "extended_ocpt": backend_to_frontend(&ocpt),
        "eocpn": eocpn
    });

    Ok(Json(payload))
}

pub async fn get_extended_ocpt(Path(file_id): Path<String>) -> impl IntoResponse {
    let path = format!("./temp/extended_ocpt_{}.json", file_id);
    match OCPT::from_json_file(&path).await {
        Ok(backend_ocpt) => (
            StatusCode::OK,
            Json(json!({
                "file_id": file_id,
                "extended_ocpt": backend_to_frontend(&backend_ocpt)
            })),
        )
            .into_response(),
        Err((status, message)) => (status, message).into_response(),
    }
}

pub async fn delete_extended_ocpt(Path(file_id): Path<String>) -> impl IntoResponse {
    let path = format!("./temp/extended_ocpt_{}.json", file_id);
    match fs::remove_file(&path).await {
        Ok(_) => (StatusCode::NO_CONTENT, "Deleted file").into_response(),
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

pub async fn get_eocpn(Path(file_id): Path<String>) -> impl IntoResponse {
    match EOCPN::import_from_path(&file_id).await {
        Ok(eocpn) => (
            StatusCode::OK,
            Json(json!({
                "file_id": file_id,
                "eocpn": eocpn
            })),
        )
            .into_response(),
        Err((status, message)) => (status, message).into_response(),
    }
}

pub async fn delete_eocpn(Path(file_id): Path<String>) -> impl IntoResponse {
    let path = format!("./temp/eocpn_{}.json", file_id);
    match fs::remove_file(&path).await {
        Ok(_) => (StatusCode::NO_CONTENT, "Deleted file").into_response(),
        Err(e) if e.kind() == ErrorKind::NotFound => (
            StatusCode::NOT_FOUND,
            format!("EOCPN file not found for file_id: {}", file_id),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to delete EOCPN: {}", e),
        )
            .into_response(),
    }
}

fn map_eocpn_convert_error(error: ConvertOcptToEocpnError) -> (StatusCode, String) {
    match error {
        ConvertOcptToEocpnError::OcpnConversion(inner) => {
            let message = inner.to_string();
            if matches!(
                inner,
                crate::core::ocpn_conversion::ConvertOcptToOcpnError::InvalidOcpt
                    | crate::core::ocpn_conversion::ConvertOcptToOcpnError::UnsupportedIdentityRelations
                    | crate::core::ocpn_conversion::ConvertOcptToOcpnError::MalformedLoop { .. }
            ) {
                (StatusCode::BAD_REQUEST, message)
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, message)
            }
        }
        ConvertOcptToEocpnError::InvalidGeneratedEocpn => {
            (StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
        }
    }
}
