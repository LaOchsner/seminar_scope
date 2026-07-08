#![allow(dead_code)] // EOCPN is introduced before the conversion routes consume it.

use crate::models::ocpn::{OCPN, OCPNNodeRef, OCPNPetriNet};
use crate::traits::import_export::{ExportableToPath, ImportableFromPath};
use async_trait::async_trait;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};
use tokio::fs;
use uuid::Uuid;

pub type EOCPNProperties = BTreeMap<String, Value>;
pub type EOCPNId = u64;
pub type EOCPNObjectTypeSet = Vec<String>;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EOCPN {
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub name: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub places: Vec<EOCPNPlace>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub transitions: Vec<EOCPNTransition>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub arcs: Vec<EOCPNArc>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub identity_relations: Vec<EOCPNIdentityRelation>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub properties: EOCPNProperties,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub nets: BTreeMap<String, OCPNPetriNet>,
}

impl EOCPN {
    pub fn normalize(mut self) -> Self {
        self.normalize_in_place();
        self
    }

    pub fn normalize_in_place(&mut self) {
        for place in &mut self.places {
            place.object_types.sort();
            place.object_types.dedup();
        }
        for transition in &mut self.transitions {
            if let Some(function) = &mut transition.function {
                function.normalize_in_place();
            }
        }
        for relation in &mut self.identity_relations {
            relation.normalize_in_place();
        }
        self.identity_relations.sort_by_key(|relation| relation.id);
        self.identity_relations.dedup_by_key(|relation| relation.id);
        for bundle in self.nets.values_mut() {
            bundle.normalize_in_place();
        }
    }

    pub fn is_valid(&self) -> bool {
        let place_ids: BTreeSet<EOCPNId> = self.places.iter().map(|place| place.id).collect();
        if place_ids.len() != self.places.len() {
            return false;
        }

        if self.places.iter().any(|place| {
            place.object_types.is_empty()
                || place
                    .object_types
                    .iter()
                    .any(|object_type| object_type.is_empty())
        }) {
            return false;
        }

        let transition_ids: BTreeSet<EOCPNId> = self
            .transitions
            .iter()
            .map(|transition| transition.id)
            .collect();
        if transition_ids.len() != self.transitions.len() {
            return false;
        }

        let arc_ids: BTreeSet<EOCPNId> = self.arcs.iter().map(|arc| arc.id).collect();
        if arc_ids.len() != self.arcs.len() {
            return false;
        }

        let identity_relation_ids: BTreeSet<EOCPNId> = self
            .identity_relations
            .iter()
            .map(|relation| relation.id)
            .collect();
        if identity_relation_ids.len() != self.identity_relations.len() {
            return false;
        }

        let mut endpoints = BTreeSet::new();
        for arc in &self.arcs {
            let endpoints_key = (arc.source.clone(), arc.target.clone());
            if !endpoints.insert(endpoints_key) {
                return false;
            }

            match (&arc.source, &arc.target) {
                (EOCPNNodeRef::Place(place_id), EOCPNNodeRef::Transition(transition_id)) => {
                    if !place_ids.contains(place_id) || !transition_ids.contains(transition_id) {
                        return false;
                    }
                }
                (EOCPNNodeRef::Transition(transition_id), EOCPNNodeRef::Place(place_id)) => {
                    if !transition_ids.contains(transition_id) || !place_ids.contains(place_id) {
                        return false;
                    }
                }
                _ => return false,
            }
        }

        if self.transitions.iter().any(|transition| {
            transition
                .function
                .as_ref()
                .is_some_and(|function| !function.is_valid())
        }) {
            return false;
        }

        if self.identity_relations.iter().any(|relation| {
            !relation.is_valid()
                || relation
                    .join_transition_id
                    .is_some_and(|id| !transition_ids.contains(&id))
                || relation
                    .resolve_transition_id
                    .is_some_and(|id| !transition_ids.contains(&id))
                || relation
                    .combined_place_id
                    .is_some_and(|id| !place_ids.contains(&id))
        }) {
            return false;
        }

        self.nets.values().all(OCPNPetriNet::is_valid)
    }

    pub fn from_ocpn(ocpn: OCPN) -> Self {
        let ocpn = ocpn.normalize();
        Self {
            name: ocpn.name,
            places: ocpn
                .places
                .into_iter()
                .map(|place| EOCPNPlace {
                    id: place.id,
                    name: place.name,
                    object_types: vec![place.object_type],
                    initial: place.initial,
                    final_place: place.final_place,
                    properties: place.properties,
                })
                .collect(),
            transitions: ocpn
                .transitions
                .into_iter()
                .map(|transition| EOCPNTransition {
                    id: transition.id,
                    name: transition.name,
                    label: transition.label,
                    silent: transition.silent,
                    function: None,
                    properties: transition.properties,
                })
                .collect(),
            arcs: ocpn
                .arcs
                .into_iter()
                .map(|arc| EOCPNArc {
                    id: arc.id,
                    source: arc.source.into(),
                    target: arc.target.into(),
                    variable: arc.variable,
                    weight: arc.weight,
                    properties: arc.properties,
                })
                .collect(),
            identity_relations: Vec::new(),
            properties: ocpn.properties,
            nets: ocpn.nets,
        }
        .normalize()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EOCPNPlace {
    pub id: EOCPNId,
    pub name: String,
    pub object_types: EOCPNObjectTypeSet,
    #[serde(default)]
    pub initial: bool,
    #[serde(rename = "final", default)]
    pub final_place: bool,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub properties: EOCPNProperties,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EOCPNTransition {
    pub id: EOCPNId,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(default)]
    pub silent: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub function: Option<EOCPNTransitionFunction>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub properties: EOCPNProperties,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(tag = "kind", content = "id", rename_all = "lowercase")]
pub enum EOCPNNodeRef {
    Place(EOCPNId),
    Transition(EOCPNId),
}

impl From<OCPNNodeRef> for EOCPNNodeRef {
    fn from(value: OCPNNodeRef) -> Self {
        match value {
            OCPNNodeRef::Place(id) => Self::Place(id),
            OCPNNodeRef::Transition(id) => Self::Transition(id),
        }
    }
}

fn default_arc_weight() -> u32 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EOCPNArc {
    pub id: EOCPNId,
    pub source: EOCPNNodeRef,
    pub target: EOCPNNodeRef,
    #[serde(default)]
    pub variable: bool,
    #[serde(default = "default_arc_weight")]
    pub weight: u32,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub properties: EOCPNProperties,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EOCPNIdentityRelation {
    pub id: EOCPNId,
    pub kind: EOCPNIdentityRelationKind,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub left: EOCPNObjectTypeSet,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub right: EOCPNObjectTypeSet,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub combined: EOCPNObjectTypeSet,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub join_transition_id: Option<EOCPNId>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolve_transition_id: Option<EOCPNId>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub combined_place_id: Option<EOCPNId>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub properties: EOCPNProperties,
}

impl EOCPNIdentityRelation {
    fn normalize_in_place(&mut self) {
        sort_dedup(&mut self.left);
        sort_dedup(&mut self.right);
        sort_dedup(&mut self.combined);
        if self.combined.is_empty() {
            self.combined = self.left.iter().chain(self.right.iter()).cloned().collect();
            sort_dedup(&mut self.combined);
        }
    }

    fn is_valid(&self) -> bool {
        !self.left.is_empty()
            && !self.right.is_empty()
            && !self.combined.is_empty()
            && self.left.iter().all(|object_type| !object_type.is_empty())
            && self.right.iter().all(|object_type| !object_type.is_empty())
            && self
                .combined
                .iter()
                .all(|object_type| !object_type.is_empty())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum EOCPNTransitionFunction {
    PassThrough,
    IdentityEnforcement {
        left: Vec<String>,
        right: Vec<String>,
        combined: Vec<String>,
        relation_kind: EOCPNIdentityRelationKind,
    },
    IdentityResolution {
        combined: Vec<String>,
        outputs: Vec<Vec<String>>,
        relation_kind: EOCPNIdentityRelationKind,
    },
    ObjectSplit {
        input: EOCPNObjectTypeSet,
        outputs: Vec<EOCPNObjectTypeSet>,
        relation_kind: EOCPNIdentityRelationKind,
    },
    ObjectMerge {
        inputs: Vec<EOCPNObjectTypeSet>,
        output: EOCPNObjectTypeSet,
        relation_kind: EOCPNIdentityRelationKind,
    },
    ExplicitMapping {
        inputs: Vec<EOCPNTokenFlow>,
        outputs: Vec<EOCPNTokenFlow>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum EOCPNIdentityRelationKind {
    Sync,
    SubsetSync,
    SubsetSyncPartition,
    SubsetSyncOverlap,
    ImpConcurrent,
    ImpOrdered,
    ImpBatch(u32),
    ObjectSplit,
    ObjectMerge,
}

impl EOCPNTransitionFunction {
    fn normalize_in_place(&mut self) {
        match self {
            Self::PassThrough => {}
            Self::IdentityEnforcement {
                left,
                right,
                combined,
                ..
            } => {
                sort_dedup(left);
                sort_dedup(right);
                sort_dedup(combined);
            }
            Self::IdentityResolution {
                combined, outputs, ..
            } => {
                sort_dedup(combined);
                for output in outputs.iter_mut() {
                    sort_dedup(output);
                }
                outputs.sort();
                outputs.dedup();
            }
            Self::ObjectSplit { input, outputs, .. } => {
                sort_dedup(input);
                normalize_type_sets(outputs);
            }
            Self::ObjectMerge { inputs, output, .. } => {
                normalize_type_sets(inputs);
                sort_dedup(output);
            }
            Self::ExplicitMapping { inputs, outputs } => {
                for flow in inputs.iter_mut().chain(outputs.iter_mut()) {
                    flow.normalize_in_place();
                }
                inputs.sort();
                inputs.dedup();
                outputs.sort();
                outputs.dedup();
            }
        }
    }

    fn is_valid(&self) -> bool {
        match self {
            Self::PassThrough => true,
            Self::IdentityEnforcement {
                left,
                right,
                combined,
                ..
            } => valid_type_set(left) && valid_type_set(right) && valid_type_set(combined),
            Self::IdentityResolution {
                combined, outputs, ..
            } => valid_type_set(combined) && valid_type_sets(outputs),
            Self::ObjectSplit { input, outputs, .. } => {
                valid_type_set(input) && valid_type_sets(outputs)
            }
            Self::ObjectMerge { inputs, output, .. } => {
                valid_type_sets(inputs) && valid_type_set(output)
            }
            Self::ExplicitMapping { inputs, outputs } => {
                !inputs.is_empty()
                    && !outputs.is_empty()
                    && inputs.iter().all(EOCPNTokenFlow::is_valid)
                    && outputs.iter().all(EOCPNTokenFlow::is_valid)
            }
        }
    }
}

fn sort_dedup(values: &mut Vec<String>) {
    values.sort();
    values.dedup();
}

fn normalize_type_sets(values: &mut Vec<EOCPNObjectTypeSet>) {
    for value in values.iter_mut() {
        sort_dedup(value);
    }
    values.sort();
    values.dedup();
}

fn valid_type_set(values: &[String]) -> bool {
    !values.is_empty() && values.iter().all(|value| !value.is_empty())
}

fn valid_type_sets(values: &[EOCPNObjectTypeSet]) -> bool {
    !values.is_empty() && values.iter().all(|value| valid_type_set(value))
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct EOCPNTokenFlow {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub place_id: Option<EOCPNId>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub object_types: EOCPNObjectTypeSet,
}

impl EOCPNTokenFlow {
    fn normalize_in_place(&mut self) {
        sort_dedup(&mut self.object_types);
    }

    fn is_valid(&self) -> bool {
        valid_type_set(&self.object_types)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct EOCPNTokenKey {
    pub place_id: EOCPNId,
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub object_ids: BTreeSet<String>,
}

impl EOCPNTokenKey {
    pub fn new(place_id: EOCPNId, object_ids: impl IntoIterator<Item = String>) -> Self {
        Self {
            place_id,
            object_ids: object_ids.into_iter().collect(),
        }
    }

    pub fn is_valid(&self) -> bool {
        !self.object_ids.is_empty()
            && self
                .object_ids
                .iter()
                .all(|object_id| !object_id.is_empty())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct EOCPNMarking {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tokens: Vec<EOCPNMarkedToken>,
}

impl EOCPNMarking {
    pub fn add_token(&mut self, token: EOCPNTokenKey) {
        self.add_tokens(token, 1);
    }

    pub fn add_tokens(&mut self, token: EOCPNTokenKey, count: u32) {
        if count == 0 {
            return;
        }
        match self.tokens.iter_mut().find(|entry| entry.token == token) {
            Some(entry) => entry.count += count,
            None => self.tokens.push(EOCPNMarkedToken { token, count }),
        }
        self.normalize_in_place();
    }

    pub fn remove_token(&mut self, token: &EOCPNTokenKey) -> bool {
        match self.tokens.iter_mut().find(|entry| &entry.token == token) {
            Some(entry) if entry.count > 1 => {
                entry.count -= 1;
                true
            }
            Some(_) => {
                self.tokens.retain(|entry| &entry.token != token);
                true
            }
            None => false,
        }
    }

    pub fn normalize_in_place(&mut self) {
        self.tokens.sort();
        let mut merged: Vec<EOCPNMarkedToken> = Vec::new();
        for entry in self.tokens.drain(..) {
            if entry.count == 0 {
                continue;
            }
            if let Some(last) = merged.last_mut() {
                if last.token == entry.token {
                    last.count += entry.count;
                    continue;
                }
            }
            merged.push(entry);
        }
        self.tokens = merged;
    }

    pub fn is_valid(&self) -> bool {
        self.tokens
            .iter()
            .all(|entry| entry.count > 0 && entry.token.is_valid())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct EOCPNMarkedToken {
    pub token: EOCPNTokenKey,
    #[serde(default = "default_token_count")]
    pub count: u32,
}

fn default_token_count() -> u32 {
    1
}

#[async_trait]
impl ImportableFromPath for EOCPN {
    async fn import_from_path(file_id: &str) -> Result<Self, (StatusCode, String)> {
        let path = format!("./temp/eocpn_{}.json", file_id);
        Self::from_json_file(&path).await
    }
}

#[async_trait]
impl ExportableToPath for EOCPN {
    async fn export_to_path(&self) -> Result<String, (StatusCode, String)> {
        fs::create_dir_all("./temp").await.map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to prepare EOCPN storage: {err}"),
            )
        })?;

        let export_id = Uuid::new_v4().to_string();
        let filename = format!("./temp/eocpn_{}.json", &export_id);
        let data = serde_json::to_string_pretty(&self.clone().normalize()).map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to serialize EOCPN: {err}"),
            )
        })?;

        fs::write(&filename, data).await.map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to persist EOCPN: {err}"),
            )
        })?;

        Ok(export_id)
    }
}

impl From<OCPN> for EOCPN {
    fn from(value: OCPN) -> Self {
        Self::from_ocpn(value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ocpn::{OCPNArc, OCPNNodeRef, OCPNPlace, OCPNProperties, OCPNTransition};
    use crate::traits::import_export::ImportableFromPath;
    use std::path::PathBuf;

    fn sample_ocpn() -> OCPN {
        OCPN {
            name: "sample".to_string(),
            places: vec![
                OCPNPlace {
                    id: 1,
                    name: "order_start".to_string(),
                    object_type: "order".to_string(),
                    initial: true,
                    final_place: false,
                    properties: OCPNProperties::new(),
                },
                OCPNPlace {
                    id: 2,
                    name: "order_end".to_string(),
                    object_type: "order".to_string(),
                    initial: false,
                    final_place: true,
                    properties: OCPNProperties::new(),
                },
            ],
            transitions: vec![OCPNTransition {
                id: 3,
                name: "register".to_string(),
                label: Some("register".to_string()),
                silent: false,
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
                    variable: false,
                    weight: 1,
                    properties: OCPNProperties::new(),
                },
            ],
            properties: OCPNProperties::new(),
            nets: BTreeMap::new(),
        }
    }

    #[test]
    fn converts_regular_ocpn_to_eocpn_with_singleton_place_types() {
        let eocpn = EOCPN::from_ocpn(sample_ocpn());

        assert!(eocpn.is_valid());
        assert_eq!(eocpn.places[0].object_types, vec!["order".to_string()]);
        assert_eq!(eocpn.transitions[0].function, None);
        assert_eq!(eocpn.arcs.len(), 2);
    }

    #[test]
    fn validates_identity_relation_links() {
        let mut eocpn = EOCPN::from_ocpn(sample_ocpn());
        eocpn.places.push(EOCPNPlace {
            id: 6,
            name: "order_item_combined".to_string(),
            object_types: vec!["item".to_string(), "order".to_string()],
            initial: false,
            final_place: false,
            properties: EOCPNProperties::new(),
        });
        eocpn.transitions.push(EOCPNTransition {
            id: 7,
            name: "sync_join".to_string(),
            label: None,
            silent: true,
            function: Some(EOCPNTransitionFunction::IdentityEnforcement {
                left: vec!["order".to_string()],
                right: vec!["item".to_string()],
                combined: vec!["order".to_string(), "item".to_string()],
                relation_kind: EOCPNIdentityRelationKind::Sync,
            }),
            properties: EOCPNProperties::new(),
        });
        eocpn.identity_relations.push(EOCPNIdentityRelation {
            id: 8,
            kind: EOCPNIdentityRelationKind::Sync,
            left: vec!["order".to_string()],
            right: vec!["item".to_string()],
            combined: vec!["item".to_string(), "order".to_string()],
            join_transition_id: Some(7),
            resolve_transition_id: None,
            combined_place_id: Some(6),
            properties: EOCPNProperties::new(),
        });

        let eocpn = eocpn.normalize();

        assert!(eocpn.is_valid());
        assert_eq!(
            eocpn.identity_relations[0].combined,
            vec!["item".to_string(), "order".to_string()]
        );
    }

    #[test]
    fn marking_counts_object_set_tokens() {
        let token = EOCPNTokenKey::new(
            6,
            ["order-1".to_string(), "item-1".to_string()]
                .into_iter()
                .collect::<Vec<_>>(),
        );
        let mut marking = EOCPNMarking::default();

        marking.add_tokens(token.clone(), 2);
        assert!(marking.is_valid());
        assert_eq!(marking.tokens[0].count, 2);

        assert!(marking.remove_token(&token));
        assert_eq!(marking.tokens[0].count, 1);
    }

    #[tokio::test]
    async fn converts_temp_ocpn_files_to_compatible_eocpn_if_present() {
        let temp_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("temp");
        let Ok(entries) = std::fs::read_dir(&temp_dir) else {
            return;
        };

        let ocpn_ids: Vec<String> = entries
            .filter_map(Result::ok)
            .filter_map(|entry| entry.file_name().into_string().ok())
            .filter_map(|name| {
                name.strip_prefix("ocpn_")
                    .and_then(|rest| rest.strip_suffix(".json"))
                    .map(str::to_string)
            })
            .collect();

        for ocpn_id in ocpn_ids {
            let ocpn = OCPN::import_from_path(&ocpn_id).await.unwrap();
            let original_place_count = ocpn.places.len();
            let original_transition_count = ocpn.transitions.len();
            let original_arc_count = ocpn.arcs.len();
            let original_variable_arc_count = ocpn.arcs.iter().filter(|arc| arc.variable).count();
            let original_object_types: BTreeSet<String> = ocpn
                .places
                .iter()
                .map(|place| place.object_type.clone())
                .collect();

            let eocpn = EOCPN::from_ocpn(ocpn);
            let converted_object_types: BTreeSet<String> = eocpn
                .places
                .iter()
                .flat_map(|place| place.object_types.iter().cloned())
                .collect();

            assert!(eocpn.is_valid(), "converted EOCPN is invalid for {ocpn_id}");
            assert_eq!(eocpn.places.len(), original_place_count, "{ocpn_id}");
            assert_eq!(
                eocpn.transitions.len(),
                original_transition_count,
                "{ocpn_id}"
            );
            assert_eq!(eocpn.arcs.len(), original_arc_count, "{ocpn_id}");
            assert_eq!(
                eocpn.arcs.iter().filter(|arc| arc.variable).count(),
                original_variable_arc_count,
                "{ocpn_id}"
            );
            assert_eq!(converted_object_types, original_object_types, "{ocpn_id}");
            assert!(
                eocpn
                    .places
                    .iter()
                    .all(|place| place.object_types.len() == 1),
                "regular OCPN compatibility should map every place to one object type for {ocpn_id}"
            );
            assert!(
                eocpn
                    .transitions
                    .iter()
                    .all(|transition| transition.function.is_none()),
                "regular OCPN compatibility should not synthesize EOCPN functions for {ocpn_id}"
            );
        }
    }
}
