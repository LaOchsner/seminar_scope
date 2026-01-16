mod check_relation;
mod ocpt_extender;

pub use check_relation::check_relation;
pub use ocpt_extender::get_extended_ocpt;

// (eid, activity, timestamp, oid, otype)
pub type Relation = (String, String, String, String, String);

pub(crate) fn format_object_type_set(object_types: &std::collections::HashSet<String>) -> String {
    let mut items: Vec<&str> = object_types.iter().map(|s| s.as_str()).collect();
    items.sort_unstable();
    format!("{{{}}}", items.join(", "))
}
