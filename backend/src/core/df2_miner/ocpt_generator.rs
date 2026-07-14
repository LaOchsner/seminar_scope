use simplelog::*;
use std::collections::{HashMap, HashSet};
use std::fs as stdfs;
use std::fs::File;

use crate::core::df2_miner::convert_to_json_tree::build_output; // << your new module
use crate::core::df2_miner::{
    build_relations_fns, divergence_free_dfg, interaction_patterns, start_cuts_opti,
};
use crate::models::ocel_sid_df2_miner::OcelJson;
use uuid::Uuid;

pub fn generate_ocpt_from_fileid_with_noise(file_id: &str, noise_threshold: f64) -> String {
    let noise_threshold = noise_threshold.clamp(0.0, 1.0);

    // Setup logging (ignore if already initialized)
    CombinedLogger::init(vec![
        TermLogger::new(
            LevelFilter::Info,
            Config::default(),
            TerminalMode::Mixed,
            ColorChoice::Auto,
        ),
        WriteLogger::new(
            LevelFilter::Info,
            Config::default(),
            File::create("process.log").unwrap(),
        ),
    ])
    .ok();

    // Load OCEL from temp
    let file_path = format!("./temp/ocel_v2_{}.json", file_id);
    let file_content = stdfs::read_to_string(&file_path).unwrap();
    let ocel: OcelJson = serde_json::from_str(&file_content).unwrap();

    // Build relations
    let relations = build_relations_fns::build_relations(&ocel.events, &ocel.objects);
    let (div, con, _rel, defi, all_activities, _all_object_types) =
        interaction_patterns::get_interaction_patterns(&relations, &ocel, noise_threshold);

    let (dfg, start_acts, end_acts) =
        divergence_free_dfg::get_divergence_free_graph_v2(&relations, &div);

    // Filter out unwanted activities
    let mut remove_list = vec![
        //"failed delivery".to_string(),
        //"payment reminder".to_string(),
    ];
    remove_list.extend(noisy_activities(&ocel.events, noise_threshold));
    let filtered_dfg = filter_dfg(&dfg, &remove_list);
    let filtered_activities = filter_activities(&all_activities, &remove_list);
    let filtered_dfg = filter_dfg_edges_by_noise(&filtered_dfg, noise_threshold);
    let start_acts = filter_activity_set(&start_acts, &filtered_activities);
    let end_acts = filter_activity_set(&end_acts, &filtered_activities);

    // Mine the process forest
    let process_forest = start_cuts_opti::find_cuts_start(
        &filtered_dfg,
        &filtered_activities,
        &start_acts,
        &end_acts,
    );

    // Convert to OCPT output format
    let ocpt_output = build_output(&process_forest, &con, &defi, &div);

    // Generate new unique file_id
    let new_file_id = Uuid::new_v4().to_string();

    // Serialize and write result
    let ocpt_json = serde_json::to_string_pretty(&ocpt_output).unwrap();
    let out_path = format!("./temp/ocpt_{}.json", new_file_id);
    stdfs::write(&out_path, ocpt_json).unwrap();

    println!(
        "✅ OCPT saved to {} (new file_id = {})",
        out_path, new_file_id
    );

    // Return the new id so caller can propagate it
    new_file_id
}

fn noisy_activities(
    events: &[crate::models::ocel_sid_df2_miner::Event],
    noise_threshold: f64,
) -> Vec<String> {
    if events.is_empty() {
        return Vec::new();
    }

    let mut counts: HashMap<String, usize> = HashMap::new();
    for event in events {
        *counts.entry(event.activity.clone()).or_default() += 1;
    }

    let mut remaining: HashSet<String> = counts.keys().cloned().collect();
    let mut remaining_event_count = events.len();
    let total_event_count = events.len();
    let mut ordered_counts: Vec<(String, usize)> = counts.into_iter().collect();
    ordered_counts.sort_by(|(activity_a, count_a), (activity_b, count_b)| {
        count_a
            .cmp(count_b)
            .then_with(|| activity_a.cmp(activity_b))
    });

    for (activity, count) in ordered_counts {
        let next_remaining = remaining_event_count.saturating_sub(count);
        let next_coverage = next_remaining as f64 / total_event_count as f64;
        if next_coverage >= noise_threshold {
            remaining.remove(&activity);
            remaining_event_count = next_remaining;
        } else {
            break;
        }
    }

    let mut removed: Vec<String> = events
        .iter()
        .map(|event| event.activity.clone())
        .collect::<HashSet<_>>()
        .difference(&remaining)
        .cloned()
        .collect();
    removed.sort();
    removed
}

fn filter_dfg(
    dfg: &HashMap<(String, String), usize>,
    remove_list: &Vec<String>,
) -> HashMap<(String, String), usize> {
    dfg.iter()
        .filter(|((from, to), _)| !remove_list.contains(from) && !remove_list.contains(to))
        .map(|(k, v)| (k.clone(), *v))
        .collect()
}

fn filter_activities(all_activities: &Vec<String>, remove_list: &Vec<String>) -> HashSet<String> {
    all_activities
        .iter()
        .filter(|activity| !remove_list.contains(*activity))
        .cloned()
        .collect()
}

fn filter_activity_set(
    activities: &HashSet<String>,
    retained_activities: &HashSet<String>,
) -> HashSet<String> {
    activities
        .iter()
        .filter(|activity| retained_activities.contains(*activity))
        .cloned()
        .collect()
}

fn filter_dfg_edges_by_noise(
    dfg: &HashMap<(String, String), usize>,
    noise_threshold: f64,
) -> HashMap<(String, String), usize> {
    let mut outgoing_totals: HashMap<String, usize> = HashMap::new();
    for ((from, _to), frequency) in dfg {
        *outgoing_totals.entry(from.clone()).or_default() += *frequency;
    }

    dfg.iter()
        .filter(|((from, _to), frequency)| {
            let Some(total) = outgoing_totals.get(from) else {
                return true;
            };
            let cutoff = (*total as f64) * (1.0 - noise_threshold);
            (**frequency as f64) >= cutoff
        })
        .map(|(edge, frequency)| (edge.clone(), *frequency))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{filter_dfg_edges_by_noise, noisy_activities};
    use crate::models::ocel_sid_df2_miner::Event;
    use std::collections::HashMap;

    fn event(id: &str, activity: &str) -> Event {
        Event {
            id: id.to_string(),
            activity: activity.to_string(),
            time: id.to_string(),
            attributes: None,
            relationships: Vec::new(),
        }
    }

    #[test]
    fn noisy_activity_filter_removes_low_frequency_nodes_while_coverage_stays_above_threshold() {
        let events = vec![
            event("1", "a"),
            event("2", "a"),
            event("3", "a"),
            event("4", "b"),
            event("5", "c"),
        ];

        assert_eq!(noisy_activities(&events, 0.8), vec!["b".to_string()]);
    }

    #[test]
    fn zero_noise_activity_filter_can_remove_all_nodes() {
        let events = vec![event("1", "a"), event("2", "b")];

        assert_eq!(
            noisy_activities(&events, 0.0),
            vec!["a".to_string(), "b".to_string()]
        );
    }

    #[test]
    fn dfg_edge_filter_removes_edges_below_outgoing_frequency_cutoff() {
        let dfg = HashMap::from([
            (("a".to_string(), "b".to_string()), 8),
            (("a".to_string(), "c".to_string()), 1),
            (("d".to_string(), "e".to_string()), 2),
        ]);

        let filtered = filter_dfg_edges_by_noise(&dfg, 0.8);

        assert!(filtered.contains_key(&("a".to_string(), "b".to_string())));
        assert!(!filtered.contains_key(&("a".to_string(), "c".to_string())));
        assert!(filtered.contains_key(&("d".to_string(), "e".to_string())));
    }

    #[test]
    fn zero_noise_edge_filter_keeps_only_edges_that_cover_all_outgoing_frequency() {
        let dfg = HashMap::from([
            (("a".to_string(), "b".to_string()), 8),
            (("a".to_string(), "c".to_string()), 1),
            (("d".to_string(), "e".to_string()), 2),
        ]);

        let filtered = filter_dfg_edges_by_noise(&dfg, 0.0);

        assert!(!filtered.contains_key(&("a".to_string(), "b".to_string())));
        assert!(!filtered.contains_key(&("a".to_string(), "c".to_string())));
        assert!(filtered.contains_key(&("d".to_string(), "e".to_string())));
    }
}
