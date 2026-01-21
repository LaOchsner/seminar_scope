use process_mining::core::event_data::object_centric::OCELType;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct GenericCaseNotion {
    pub start_types: Vec<OCELType>,
    pub e2o_relations: Vec<(OCELType, OCELType)>,
    pub o2o_relations: Vec<(OCELType, OCELType)>,
}
