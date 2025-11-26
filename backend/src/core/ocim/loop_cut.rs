use rustc_hash::FxHashSet;

use crate::core::ocim::auxiliary_methods::{get_divergent_types, get_non_divergent_types};
use crate::core::ocim::common_data::{GlobalData, LocalData};

/// Rust port of `is_loop_cut_valid` from the Python OCIM prototype.
/// Validates the two-part loop cut conditions (Eq. 26-32).
pub fn is_loop_cut_valid(
    local_data: &LocalData,
    global_data: &GlobalData,
    partition_list: &[Vec<String>],
) -> bool {
    let body = match partition_list.get(0) {
        Some(p) => p,
        None => return false,
    };
    let redo = match partition_list.get(1) {
        Some(p) => p,
        None => return false,
    };

    let loop_activities: Vec<String> = body.iter().chain(redo.iter()).cloned().collect();
    let part_set: FxHashSet<_> = partition_list.iter().flatten().cloned().collect();
    let alphabet_set: FxHashSet<_> = local_data.alphabet.iter().cloned().collect();
    if part_set != alphabet_set {
        return false;
    }

    // Eq. 26: at least one non-divergent object type between the two parts.
    let mut has_non_divergent = false;
    'outer: for a in body {
        for b in redo {
            if !get_non_divergent_types(a, b, &loop_activities, global_data).is_empty() {
                has_non_divergent = true;
                break 'outer;
            }
        }
    }
    if !has_non_divergent {
        return false;
    }

    // Eq. 27: fully divergent types need bi-directional directly-follows edges.
    for a in body {
        for b in redo {
            for ot in get_divergent_types(a, b, &loop_activities, global_data) {
                if let Some((dfg, _, _)) = local_data.dfgs.get(&ot) {
                    let ab = dfg.get(&(a.clone(), b.clone())).copied().unwrap_or(0);
                    let ba = dfg.get(&(b.clone(), a.clone())).copied().unwrap_or(0);
                    if ab == 0 || ba == 0 {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }
    }

    // Eq. 28: non-divergent types need bi-directional reachability (closure).
    for a in &loop_activities {
        for b in &loop_activities {
            for ot in get_non_divergent_types(a, b, &loop_activities, global_data) {
                if let Some(clos) = local_data.clos.get(&ot) {
                    let ab = (a.clone(), b.clone());
                    let ba = (b.clone(), a.clone());
                    if !clos.contains(&ab) || !clos.contains(&ba) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }
    }

    // Collect relevant object types (non-divergent between body and redo).
    let mut relevant_types: FxHashSet<String> = FxHashSet::default();
    for a in body {
        for b in redo {
            for ot in get_non_divergent_types(a, b, &loop_activities, global_data) {
                relevant_types.insert(ot);
            }
        }
    }

    let body_set: FxHashSet<_> = body.iter().cloned().collect();
    let all_set: FxHashSet<_> = loop_activities.iter().cloned().collect();

    // Eq. 29: starts for relevant types must stay in the body part.
    for ot in &relevant_types {
        if let Some((_, starts, _)) = local_data.dfgs.get(ot) {
            for (act, value) in starts {
                if *value > 0 && all_set.contains(act) && !body_set.contains(act) {
                    return false;
                }
            }
        } else {
            return false;
        }
    }

    // Eq. 30: ends for relevant types must stay in the body part.
    for ot in &relevant_types {
        if let Some((_, _, ends)) = local_data.dfgs.get(ot) {
            for (act, value) in ends {
                if *value > 0 && all_set.contains(act) && !body_set.contains(act) {
                    return false;
                }
            }
        } else {
            return false;
        }
    }

    // Eq. 31: body -> redo crossings only from end activities of the body.
    for a in body {
        for b in redo {
            for ot in get_non_divergent_types(a, b, &loop_activities, global_data) {
                if let Some((dfg, _, ends)) = local_data.dfgs.get(&ot) {
                    let edge_exists = dfg
                        .get(&(a.clone(), b.clone()))
                        .map_or(false, |v| *v > 0);
                    if edge_exists && ends.get(a).copied().unwrap_or(0) == 0 {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }
    }

    // Eq. 32: redo -> body crossings only to start activities of the body.
    for a in redo {
        for b in body {
            for ot in get_non_divergent_types(a, b, &loop_activities, global_data) {
                if let Some((dfg, starts, _)) = local_data.dfgs.get(&ot) {
                    let edge_exists = dfg
                        .get(&(a.clone(), b.clone()))
                        .map_or(false, |v| *v > 0);
                    if edge_exists && starts.get(b).copied().unwrap_or(0) == 0 {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }
    }

    true
}
