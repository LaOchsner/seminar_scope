use crate::traits::import_export::{ExportableToPath, ImportableFromPath};
use async_trait::async_trait;
use axum::http::StatusCode;
use serde_json;
use tokio::fs;
use uuid::Uuid;

pub use process_mining::conformance::object_centric::object_centric_language_abstraction::OCLanguageAbstraction;

#[async_trait]
impl ImportableFromPath for OCLanguageAbstraction {
    async fn import_from_path(file_id: &str) -> Result<Self, (StatusCode, String)> {
        let path = format!("./temp/abstraction_{}.json", file_id);
        Self::from_json_file(&path).await
    }
}

#[async_trait]
impl ExportableToPath for OCLanguageAbstraction {
    async fn export_to_path(&self) -> Result<String, (StatusCode, String)> {
        fs::create_dir_all("./temp").await.map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to prepare abstraction storage: {err}"),
            )
        })?;

        let export_id = Uuid::new_v4().to_string();
        let filename = format!("./temp/abstraction_{}.json", &export_id);

        let data = serde_json::to_string_pretty(self).map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to serialize abstraction: {err}"),
            )
        })?;

        fs::write(&filename, data).await.map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to persist abstraction: {err}"),
            )
        })?;

        Ok(export_id)
    }
}
