use crate::models::ocel::OCEL;
use crate::models::ocel_collection::OCELCollection;
use crate::traits::import_export::ImportableFromPath;
use axum::http::StatusCode;
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct SelectedCases {
    pub left_case: OCEL,
    pub right_case: OCEL,
    pub attributes: HashMap<String, Value>,
}

#[derive(Debug, Clone)]
pub struct SelectedCase {
    pub case: OCEL,
    pub attributes: HashMap<String, Value>,
}

pub async fn load_selected_cases(
    case_ocels_file_id: &str,
    left_case_index: usize,
    right_case_index: usize,
) -> Result<SelectedCases, (StatusCode, String)> {
    let collection = OCELCollection::import_from_path(case_ocels_file_id).await?;
    // Selection consumes the collection so the response can carry its metadata without extra clones.
    select_cases(collection, left_case_index, right_case_index)
}

pub async fn load_case(
    case_ocels_file_id: &str,
    case_index: usize,
) -> Result<SelectedCase, (StatusCode, String)> {
    let collection = OCELCollection::import_from_path(case_ocels_file_id).await?;
    select_case(collection, case_index)
}

fn select_cases(
    collection: OCELCollection,
    left_case_index: usize,
    right_case_index: usize,
) -> Result<SelectedCases, (StatusCode, String)> {
    let total_cases = collection.ocels.len();
    if total_cases == 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Stored case OCEL collection is empty".to_string(),
        ));
    }

    let left_case = get_case(
        &collection.ocels,
        left_case_index,
        total_cases,
        "left_case_index",
    )?;
    let right_case = get_case(
        &collection.ocels,
        right_case_index,
        total_cases,
        "right_case_index",
    )?;

    Ok(SelectedCases {
        left_case,
        right_case,
        attributes: collection.attributes,
    })
}

fn select_case(
    collection: OCELCollection,
    case_index: usize,
) -> Result<SelectedCase, (StatusCode, String)> {
    let total_cases = collection.ocels.len();
    if total_cases == 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Stored case OCEL collection is empty".to_string(),
        ));
    }

    let case = get_case(&collection.ocels, case_index, total_cases, "case_index")?;

    Ok(SelectedCase {
        case,
        attributes: collection.attributes,
    })
}

fn get_case(
    cases: &[OCEL],
    case_index: usize,
    total_cases: usize,
    field_name: &str,
) -> Result<OCEL, (StatusCode, String)> {
    cases.get(case_index).cloned().ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            format!(
                "{} {} is out of bounds for collection with {} cases",
                field_name, case_index, total_cases
            ),
        )
    })
}
