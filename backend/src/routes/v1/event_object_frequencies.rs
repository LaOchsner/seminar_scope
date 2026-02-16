use crate::handlers::event_object_frequencies::{
    get_event_perspective_histogram, get_object_perspective_histogram, post_ocel_filter,
};
use axum::{
    Router,
    routing::{get, post},
};

pub fn router() -> Router {
    Router::new()
        .route(
            "/event_perspective_histogram/{file_id}",
            get(get_event_perspective_histogram),
        )
        .route(
            "/object_perspective_histogram/{file_id}",
            get(get_object_perspective_histogram),
        )
        .route("/histogram_filter/{file_id}", post(post_ocel_filter))
}
