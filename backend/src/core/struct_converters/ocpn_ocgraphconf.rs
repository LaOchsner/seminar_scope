use crate::models::ocpn::{OCPN, OCPNArc, OCPNId, OCPNNodeRef};
use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct OcgraphconfOcpn {
    pub places: Vec<OcgraphconfPlace>,
    pub transitions: Vec<OcgraphconfTransition>,
    pub input_arcs: Vec<OcgraphconfArc>,
    pub output_arcs: Vec<OcgraphconfArc>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct OcgraphconfPlace {
    pub id: OCPNId,
    pub name: String,
    pub object_type: String,
    pub initial: bool,
    #[serde(rename = "final")]
    pub final_place: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct OcgraphconfTransition {
    pub id: OCPNId,
    pub name: String,
    pub label: String,
    pub silent: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct OcgraphconfArc {
    pub id: OCPNId,
    pub source: OCPNId,
    pub target: OCPNId,
    pub variable: bool,
    pub weight: u32,
}

pub fn backend_to_ocgraphconf(ocpn: &OCPN) -> OcgraphconfOcpn {
    let places = ocpn
        .places
        .iter()
        .map(|place| OcgraphconfPlace {
            id: place.id,
            name: place.name.clone(),
            object_type: place.object_type.clone(),
            initial: place.initial,
            final_place: place.final_place,
        })
        .collect();

    let transitions = ocpn
        .transitions
        .iter()
        .map(|transition| OcgraphconfTransition {
            id: transition.id,
            name: transition.name.clone(),
            // ocgraphconf's importer unwraps `label`, so always provide a string.
            label: transition
                .label
                .clone()
                .unwrap_or_else(|| transition.name.clone()),
            silent: transition.silent,
        })
        .collect();

    let mut input_arcs = Vec::new();
    let mut output_arcs = Vec::new();
    for arc in &ocpn.arcs {
        match directional_arc(arc) {
            DirectionalArc::Input(arc) => input_arcs.push(arc),
            DirectionalArc::Output(arc) => output_arcs.push(arc),
        }
    }

    OcgraphconfOcpn {
        places,
        transitions,
        input_arcs,
        output_arcs,
    }
}

enum DirectionalArc {
    Input(OcgraphconfArc),
    Output(OcgraphconfArc),
}

fn directional_arc(arc: &OCPNArc) -> DirectionalArc {
    let mapped = OcgraphconfArc {
        id: arc.id,
        source: match arc.source {
            OCPNNodeRef::Place(id) | OCPNNodeRef::Transition(id) => id,
        },
        target: match arc.target {
            OCPNNodeRef::Place(id) | OCPNNodeRef::Transition(id) => id,
        },
        variable: arc.variable,
        weight: arc.weight,
    };

    match (&arc.source, &arc.target) {
        (OCPNNodeRef::Place(_), OCPNNodeRef::Transition(_)) => DirectionalArc::Input(mapped),
        (OCPNNodeRef::Transition(_), OCPNNodeRef::Place(_)) => DirectionalArc::Output(mapped),
        _ => unreachable!("OCPN arcs are always bipartite"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ocpn::{
        OCPN, OCPNArc, OCPNNodeRef, OCPNPlace, OCPNProperties, OCPNTransition,
    };
    use std::collections::BTreeMap;

    fn sample_ocpn() -> OCPN {
        OCPN {
            name: "sample".to_string(),
            places: vec![
                OCPNPlace {
                    id: 1,
                    name: "order1".to_string(),
                    object_type: "order".to_string(),
                    initial: true,
                    final_place: false,
                    properties: OCPNProperties::new(),
                },
                OCPNPlace {
                    id: 2,
                    name: "order2".to_string(),
                    object_type: "order".to_string(),
                    initial: false,
                    final_place: true,
                    properties: OCPNProperties::new(),
                },
            ],
            transitions: vec![OCPNTransition {
                id: 3,
                name: "tau_3".to_string(),
                label: None,
                silent: true,
                properties: OCPNProperties::new(),
            }],
            arcs: vec![
                OCPNArc {
                    id: 4,
                    source: OCPNNodeRef::Place(1),
                    target: OCPNNodeRef::Transition(3),
                    variable: false,
                    weight: 1,
                    properties: OCPNProperties::new(),
                },
                OCPNArc {
                    id: 5,
                    source: OCPNNodeRef::Transition(3),
                    target: OCPNNodeRef::Place(2),
                    variable: true,
                    weight: 2,
                    properties: OCPNProperties::new(),
                },
            ],
            properties: BTreeMap::new(),
            nets: BTreeMap::new(),
        }
    }

    #[test]
    fn converts_backend_ocpn_to_ocgraphconf_shape() {
        let converted = backend_to_ocgraphconf(&sample_ocpn());

        assert_eq!(converted.places.len(), 2);
        assert_eq!(converted.transitions.len(), 1);
        assert_eq!(converted.input_arcs.len(), 1);
        assert_eq!(converted.output_arcs.len(), 1);
        assert_eq!(converted.transitions[0].label, "tau_3");
        assert!(converted.transitions[0].silent);
        assert_eq!(converted.output_arcs[0].weight, 2);
    }
}
