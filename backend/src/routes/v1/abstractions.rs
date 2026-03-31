use crate::handlers::abstractions::{
    get_extended_ocpt_abstraction, get_ocel_abstraction, get_ocpt_abstraction,
};
use axum::{Router, routing::get};

pub fn router() -> Router {
    Router::new()
        .route("/ocel/{file_id}", get(get_ocel_abstraction))
        .route("/ocpt/{file_id}", get(get_ocpt_abstraction))
        .route(
            "/extended_ocpt/{file_id}",
            get(get_extended_ocpt_abstraction),
        )
}
