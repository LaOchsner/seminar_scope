use crate::handlers::resource_miner::{
    get_resource_miner, get_special_activity_non_diverging_combinations,
    post_fix_multiple_special_activities,
};
use axum::{
    Router,
    routing::{get, post},
};

pub fn router() -> Router {
    Router::new()
        .route("/{file_id}", get(get_resource_miner))
        .route(
            "/{file_id}/special/{activity}/non_diverging_combinations",
            get(get_special_activity_non_diverging_combinations),
        )
        .route(
            "/{file_id}/fix_multiple_special_activities",
            post(post_fix_multiple_special_activities),
        )
}
