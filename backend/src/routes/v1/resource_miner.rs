use crate::handlers::resource_miner::get_resource_miner;
use axum::{Router, routing::get};

pub fn router() -> Router {
    Router::new().route("/{file_id}", get(get_resource_miner))
}
