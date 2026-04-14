use crate::handlers::resource_miner::{
    get_resource_miner, get_special_activity_non_diverging_combinations,
};
use axum::{Router, routing::get};

pub fn router() -> Router {
    Router::new()
        .route("/{file_id}", get(get_resource_miner))
        .route(
            "/{file_id}/special/{activity}/non_diverging_combinations",
            get(get_special_activity_non_diverging_combinations),
        )
}
