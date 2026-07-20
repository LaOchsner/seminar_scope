mod candidate_trees;
mod check_relation;
mod noise_resistant_check_relations;
mod ocpt_extender;

#[allow(unused_imports)]
pub use candidate_trees::{
    CandidateTreeResult, NormalFormResult, NormalizationError, ReductionRule,
    generate_candidate_trees, normalize_candidate_tree,
};
#[allow(unused_imports)]
pub use check_relation::check_relation;
#[allow(unused_imports)]
pub use noise_resistant_check_relations::{
    NoiseResistantRelationFamily, check_noise_resistant_relation, detect_object_merge_split,
    object_types_first_or_last,
};
#[allow(unused_imports)]
pub use ocpt_extender::{ExtendedCandidateSelection, get_best_extended_ocpt, get_extended_ocpt};

// (eid, activity, timestamp, oid, otype)
pub type Relation = (String, String, String, String, String);
