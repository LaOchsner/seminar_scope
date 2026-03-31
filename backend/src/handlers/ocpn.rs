use crate::handlers::ocpt::ensure_temp_dir;
use crate::core::ocpn_conversion::{
    convert_ocpt_to_ocpn, ConvertOcptToOcpnError,
};
use crate::models::ocpn::OCPN;
use crate::models::ocpt::OCPT;
use crate::traits::import_export::{ExportableToPath, ImportableFromPath};
use axum::{Json, extract::Path, http::StatusCode, response::IntoResponse, response::Response};
use axum_extra::extract::Multipart;
use serde_json::Value;
use tokio::fs;

pub async fn post_ocpn(mut multipart: Multipart) -> Response {
    let mut file_id: Option<String> = None;
    let mut file_bytes: Option<bytes::Bytes> = None;

    while let Some(field) = match multipart.next_field().await {
        Ok(field) => field,
        Err(err) => {
            return (
                StatusCode::BAD_REQUEST,
                format!("Malformed multipart: {err}"),
            )
                .into_response();
        }
    } {
        match field.name().unwrap_or("") {
            "file_id" => file_id = Some(field.text().await.unwrap_or_default()),
            "file" => file_bytes = Some(field.bytes().await.unwrap_or_default()),
            _ => {}
        }
    }

    let (id, bytes) = match (file_id, file_bytes) {
        (Some(id), Some(bytes)) if !id.is_empty() && !bytes.is_empty() => (id, bytes),
        _ => return (StatusCode::BAD_REQUEST, "Missing file or fileId").into_response(),
    };

    let text = match str::from_utf8(&bytes) {
        Ok(text) => text,
        Err(err) => {
            return (StatusCode::BAD_REQUEST, format!("File not UTF-8: {err}")).into_response();
        }
    };
    let value: Value = match serde_json::from_str(text) {
        Ok(value) => value,
        Err(err) => {
            return (StatusCode::BAD_REQUEST, format!("Invalid JSON: {err}")).into_response();
        }
    };

    if let Err(err) = ensure_temp_dir().await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to prepare storage: {err}"),
        )
            .into_response();
    }

    let ocpn: OCPN = match serde_json::from_value(value) {
        Ok(ocpn) => ocpn,
        Err(err) => {
            return (
                StatusCode::BAD_REQUEST,
                format!("Invalid OCPN payload: {err}"),
            )
                .into_response();
        }
    };
    let ocpn = ocpn.normalize();

    let path = format!("./temp/ocpn_{id}.json");
    let pretty = match serde_json::to_string_pretty(&ocpn) {
        Ok(serialized) => serialized,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Serialize OCPN failed: {err}"),
            )
                .into_response();
        }
    };
    if let Err(err) = fs::write(&path, pretty).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to save OCPN: {err}"),
        )
            .into_response();
    }

    let resp = serde_json::json!({
        "status": "ok",
        "kind": "ocpn",
        "saved_as": path,
        "is_valid": ocpn.is_valid(),
    });
    (StatusCode::OK, Json(resp)).into_response()
}

pub async fn get_ocpn(Path(file_id): Path<String>) -> impl IntoResponse {
    println!("-> GET /v1/objects/ocpn/{}", file_id);

    match OCPN::import_from_path(&file_id).await {
        Ok(ocpn) => {
            let payload = serde_json::json!({
                "file_id": file_id,
                "ocpn": ocpn,
            });
            (StatusCode::OK, Json(payload)).into_response()
        }
        Err((status, message)) => (status, message).into_response(),
    }
}

pub async fn get_ocpn_from_ocpt(
    Path(ocpt_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let ocpt = OCPT::import_from_path(&ocpt_id).await?;
    if !ocpt.is_valid() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Source OCPT is invalid".to_string(),
        ));
    }

    let ocpn = convert_ocpt_to_ocpn(&ocpt).map_err(map_convert_error)?;
    let file_id = ocpn.export_to_path().await?;
    let payload = serde_json::json!({
        "file_id": file_id,
        "ocpn": ocpn,
    });
    Ok((StatusCode::OK, Json(payload)))
}

pub async fn delete_ocpn(Path(file_id): Path<String>) -> impl IntoResponse {
    println!("DELETE /v1/objects/ocpn/{}", file_id);
    let ocpn_path = format!("./temp/ocpn_{}.json", file_id);
    match fs::remove_file(&ocpn_path).await {
        Ok(_) => (StatusCode::NO_CONTENT, "Deleted file").into_response(),
        Err(err) => {
            eprintln!("Failed to delete file {}: {}", ocpn_path, err);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to delete file").into_response()
        }
    }
}

fn map_convert_error(error: ConvertOcptToOcpnError) -> (StatusCode, String) {
    match error {
        ConvertOcptToOcpnError::InvalidOcpt
        | ConvertOcptToOcpnError::UnsupportedIdentityRelations
        | ConvertOcptToOcpnError::MalformedLoop { .. } => {
            (StatusCode::BAD_REQUEST, error.to_string())
        }
        ConvertOcptToOcpnError::InvalidProjectedProcessTree
        | ConvertOcptToOcpnError::InvalidGeneratedOcpn => {
            (StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
        }
    }
}
