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
use serde::de::DeserializeOwned;
use std::io;

/// A trait that defines asynchronous import functionality for types that can be
/// deserialized from JSON files stored on disk. It provides:
///
/// - A reusable helper method [`from_json_file`] for reading and deserializing
///   any JSON file into a type implementing [`DeserializeOwned`].
/// - A high-level [`import_from_path`] function that can be customized per type
///   (e.g., by constructing file paths or applying pre/post-processing).
///
/// # Example
///
/// ```rust,ignore
/// let ocel = OCEL::import_from_path("example_id").await?;
/// ```
/// # Implementation Notes
///
/// - Implementations should typically call [`from_json_file`] inside their
///   [`import_from_path`] method to handle I/O and deserialization.
/// - This trait requires `Sized` and `DeserializeOwned` bounds, so it can
///   construct owned instances of `Self` directly from the file.
#[async_trait]
pub trait ImportableFromPath: Sized + DeserializeOwned {
    /// Reads and deserializes a JSON file asynchronously into the implementing type.
    ///
    /// This function uses Tokio’s asynchronous file I/O to load the file contents
    /// and then attempts to parse the data using [`serde_json`].
    ///
    /// # Arguments
    /// * `path` – The filesystem path to the JSON file.
    ///
    /// # Returns
    /// - `Ok(Self)` if the file was successfully read and parsed.
    /// - `Err((StatusCode, String))` if reading or parsing fails.
    async fn from_json_file(path: &str) -> Result<Self, (StatusCode, String)> {
        let content = tokio::fs::read_to_string(path).await.map_err(|err| {
            log::error!("Failed to read file {}: {}", path, err);
            if err.kind() == io::ErrorKind::NotFound {
                (StatusCode::NOT_FOUND, format!("File not found: {}", path))
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to read stored file".to_string(),
                )
            }
        })?;

        serde_json::from_str::<Self>(&content).map_err(|err| {
            log::error!("Failed to parse JSON file {}: {}", path, err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Invalid JSON structure".to_string(),
            )
        })
    }

    /// Imports an instance from a file path derived from a logical identifier.
    ///
    /// This higher-level function defines how to locate and import files based
    /// on an external identifier (e.g., `file_id`). Implementations can apply
    /// custom logic to build the appropriate path before calling
    /// [`from_json_file`].
    ///
    /// # Arguments
    /// * `file_id` – The logical identifier for the file.
    ///
    /// # Returns
    /// A deserialized instance of the implementing type, or an error tuple if
    /// reading/parsing fails.
    async fn import_from_path(file_id: &str) -> Result<Self, (StatusCode, String)>;
}

/// Implementation of [`ImportableFromPath`] for [`OCEL`].
///
/// This implementation constructs the file path using a standard naming pattern:
/// `./temp/ocel_v2_<file_id>.json`, then imports and deserializes the file using
/// [`ImportableFromPath::from_json_file`].
///
/// # Example
///
/// ```rust,ignore
/// let ocel = OCEL::import_from_path("18d356df-2be1-4af9-8618-debe98a0575b").await?;
/// ```
#[async_trait]
impl ImportableFromPath for OCEL {
    async fn import_from_path(file_id: &str) -> Result<Self, (StatusCode, String)> {
        let path = format!("./temp/ocel_v2_{}.json", file_id);
        Self::from_json_file(&path).await
    }
}