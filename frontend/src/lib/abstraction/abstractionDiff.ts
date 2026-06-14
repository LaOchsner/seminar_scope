import type { OCLanguageAbstraction } from '~/types/abstraction.types';

export interface DfgDiff {
    uniqueEvents: Set<string>;
    sharedEvents: Set<string>;
    uniqueEdges: Set<string>;
    sharedEdges: Set<string>;
    /** Start events in THIS OT that are not start events in the other OT. */
    uniqueStartEvents: Set<string>;
    /** End events in THIS OT that are not end events in the other OT. */
    uniqueEndEvents: Set<string>;
}

function eventsForOt(abstraction: OCLanguageAbstraction, ot: string): Set<string> {
    const events = new Set<string>();
    for (const [from, to] of abstraction.directly_follows_ev_types_per_ob_type[ot] ?? []) {
        events.add(from);
        events.add(to);
    }
    return events;
}

function edgesForOt(abstraction: OCLanguageAbstraction, ot: string): Set<string> {
    return new Set(
        (abstraction.directly_follows_ev_types_per_ob_type[ot] ?? []).map(([from, to]) => `${from}|${to}`)
    );
}

/**
 * Computes which events and DF-edges are unique to `thisOt` vs `otherOt`,
 * and which are shared. Returns the result from `thisOt`'s perspective.
 */
export function computeDfgDiff(
    abstraction: OCLanguageAbstraction,
    thisOt: string,
    otherOt: string
): DfgDiff {
    const thisEvents = eventsForOt(abstraction, thisOt);
    const otherEvents = eventsForOt(abstraction, otherOt);
    const thisEdges = edgesForOt(abstraction, thisOt);
    const otherEdges = edgesForOt(abstraction, otherOt);

    const uniqueEvents = new Set<string>();
    const sharedEvents = new Set<string>();
    for (const ev of thisEvents) {
        if (otherEvents.has(ev)) sharedEvents.add(ev);
        else uniqueEvents.add(ev);
    }

    const uniqueEdges = new Set<string>();
    const sharedEdges = new Set<string>();
    for (const edge of thisEdges) {
        if (otherEdges.has(edge)) sharedEdges.add(edge);
        else uniqueEdges.add(edge);
    }

    const thisStarts = new Set(abstraction.start_ev_type_per_ob_type[thisOt] ?? []);
    const otherStarts = new Set(abstraction.start_ev_type_per_ob_type[otherOt] ?? []);
    const uniqueStartEvents = new Set([...thisStarts].filter((e) => !otherStarts.has(e)));

    const thisEnds = new Set(abstraction.end_ev_type_per_ob_type[thisOt] ?? []);
    const otherEnds = new Set(abstraction.end_ev_type_per_ob_type[otherOt] ?? []);
    const uniqueEndEvents = new Set([...thisEnds].filter((e) => !otherEnds.has(e)));

    return { uniqueEvents, sharedEvents, uniqueEdges, sharedEdges, uniqueStartEvents, uniqueEndEvents };
}

/**
 * Cross-abstraction variant: compares `thisOt` from `thisAbstraction` against
 * `otherOt` from a different `otherAbstraction`. Returns diff from `thisOt`'s perspective.
 */
export function computeCrossAbstractionDiff(
    thisAbstraction: OCLanguageAbstraction,
    thisOt: string,
    otherAbstraction: OCLanguageAbstraction,
    otherOt: string
): DfgDiff {
    const thisEvents = eventsForOt(thisAbstraction, thisOt);
    const otherEvents = eventsForOt(otherAbstraction, otherOt);
    const thisEdges = edgesForOt(thisAbstraction, thisOt);
    const otherEdges = edgesForOt(otherAbstraction, otherOt);

    const uniqueEvents = new Set<string>();
    const sharedEvents = new Set<string>();
    for (const ev of thisEvents) {
        if (otherEvents.has(ev)) sharedEvents.add(ev);
        else uniqueEvents.add(ev);
    }

    const uniqueEdges = new Set<string>();
    const sharedEdges = new Set<string>();
    for (const edge of thisEdges) {
        if (otherEdges.has(edge)) sharedEdges.add(edge);
        else uniqueEdges.add(edge);
    }

    const thisStarts = new Set(thisAbstraction.start_ev_type_per_ob_type[thisOt] ?? []);
    const otherStarts = new Set(otherAbstraction.start_ev_type_per_ob_type[otherOt] ?? []);
    const uniqueStartEvents = new Set([...thisStarts].filter((e) => !otherStarts.has(e)));

    const thisEnds = new Set(thisAbstraction.end_ev_type_per_ob_type[thisOt] ?? []);
    const otherEnds = new Set(otherAbstraction.end_ev_type_per_ob_type[otherOt] ?? []);
    const uniqueEndEvents = new Set([...thisEnds].filter((e) => !otherEnds.has(e)));

    return { uniqueEvents, sharedEvents, uniqueEdges, sharedEdges, uniqueStartEvents, uniqueEndEvents };
}
