#[allow(unused_imports)] // probably used in the future
pub use process_mining::ocel::linked_ocel;
pub use process_mining::ocel::linked_ocel::{IndexLinkedOCEL, LinkedOCELAccess};
#[allow(unused_imports)] // probably used in the future
pub use process_mining::ocel::ocel_struct::{
    OCEL, OCELAttributeType, OCELAttributeValue, OCELEvent, OCELEventAttribute, OCELObject,
    OCELObjectAttribute, OCELRelationship, OCELType, OCELTypeAttribute,
};

pub use process_mining::ocel::linked_ocel::index_linked_ocel::{EventIndex, ObjectIndex};


use async_trait::async_trait;
use axum::http::StatusCode;
use std::io;
use serde::de::DeserializeOwned;

#[async_trait]
pub trait ImportableFromPath: Sized + DeserializeOwned {
    async fn import_from_path(path: &str) -> Result<Self, (StatusCode, String)> {
        let content = tokio::fs::read_to_string(path).await.map_err(|err| {
            log::error!("failed to read file: {err}");
            if err.kind() == io::ErrorKind::NotFound {
                (StatusCode::NOT_FOUND, format!("File not found: {}", path))
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, "Failed to read file".to_string())
            }
        })?;

        serde_json::from_str::<Self>(&content).map_err(|err| {
            log::error!("failed to parse JSON: {err}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Invalid JSON file".to_string(),
            )
        })
    }
}

#[async_trait]
impl ImportableFromPath for OCEL {
    async fn import_from_path(file_id: &str) -> Result<Self, (StatusCode, String)> {
        let path = format!("./temp/ocel_v2_{}.json", file_id);
        Self::import_from_path(&path).await
    }
}
