use crate::handlers::clustering::cluster_case_ocels;
use axum::{Router, routing::get};

pub fn router() -> Router {
    Router::new().route("/cluster/{case_ocels_file_id}", get(cluster_case_ocels))
}
