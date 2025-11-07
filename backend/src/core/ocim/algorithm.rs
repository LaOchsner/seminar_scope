use process_mining::OCEL;
use crate::models::ocpt::{OCPTNode, OCPT};
use std::collections::HashSet;

pub fn ocim_discover_ocpt(log: &OCEL) -> OCPT {
    let objects: HashSet<String> = log
        .objects
        .iter()
        .map(|obj| obj.id.clone())
        .collect();
    let root_node = ocim_recursive(vec![log], &objects);
    OCPT::new(root_node)
}

fn ocim_recursive(logs: Vec<&OCEL>, objects: &HashSet<String>) -> OCPTNode {
    // TODO: Implement the recursive logic of the OCIM algorithm
    // For now, returning a dummy leaf
    OCPTNode::new_leaf(Some("DUMMY".to_string()))
}