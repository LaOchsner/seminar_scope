import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import { Position } from '@xyflow/react';
import type { AbstractionDfEdgeData } from '~/components/abstraction/edges/AbstractionDfEdge';
import type { AbstractionOtEvEdgeData } from '~/components/abstraction/edges/AbstractionOtEvEdge';
import type { OCLanguageAbstraction } from '~/types/abstraction.types';

const OT_NODE_SIZE = 80;
const OT_TO_EV_GAP = 60;
const GROUP_GAP = 120;

const EV_NODE_WIDTH = 150;
const EV_NODE_HEIGHT = 36;

const DAGRE_OPTS = { rankdir: 'TB', nodesep: 40, ranksep: 60, acyclicer: 'greedy', ranker: 'network-simplex' } as const;

/** For a self-loop node, pick the side with fewest other connected edges using dagre positions.
 *  Prefers Right > Left > Top > Bottom as a tiebreaker, since OtEv edges always arrive from the left
 *  and DF edges run top-to-bottom in a TB layout.
 */
function bestLoopSide(
    nodeId: string,
    dfRelations: [string, string][],
    g: InstanceType<typeof dagre.graphlib.Graph>
): Position {
    const node = g.node(nodeId);
    // Preference order when counts are tied
    const preference = [Position.Right, Position.Left, Position.Top, Position.Bottom];
    const counts: Record<string, number> = Object.fromEntries(preference.map((p) => [p, 0]));

    for (const [from, to] of dfRelations) {
        if (from === to) continue; // skip other self-loops
        const otherId = from === nodeId ? to : to === nodeId ? from : null;
        if (!otherId) continue;
        const other = g.node(otherId);
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        if (Math.abs(dy) >= Math.abs(dx)) {
            counts[dy >= 0 ? Position.Bottom : Position.Top]++;
        } else {
            counts[dx >= 0 ? Position.Right : Position.Left]++;
        }
    }

    return preference.slice().sort((a, b) => counts[a] - counts[b])[0];
}

export const toObjectTypeGroup = (
    objectType: string,
    abstraction: OCLanguageAbstraction,
    xOffset: number,
    getObjectColor: (objectType: string) => string
): { nodes: Node[]; edges: Edge[]; groupWidth: number } => {
    const dfRelations = abstraction.directly_follows_ev_types_per_ob_type[objectType] ?? [];
    const eventTypes = Array.from(new Set(dfRelations.flatMap(([from, to]) => [from, to]))).sort();

    // ── Dagre layout for event nodes only ────────────────────────────────────
    const g = new dagre.graphlib.Graph();
    g.setGraph(DAGRE_OPTS);
    g.setDefaultEdgeLabel(() => ({}));

    for (const ev of eventTypes) {
        g.setNode(ev, { width: EV_NODE_WIDTH, height: EV_NODE_HEIGHT });
    }
    for (const [from, to] of dfRelations) {
        g.setEdge(from, to);
    }
    dagre.layout(g);

    const dagreGraphWidth = g.graph().width ?? 0;
    const dagreGraphHeight = g.graph().height ?? 0;

    // ── OtNode: placed to the left, vertically centered on the DFG ──────────
    const evXOffset = xOffset + OT_NODE_SIZE + OT_TO_EV_GAP;
    const otY = dagreGraphHeight / 2 - OT_NODE_SIZE / 2;
    const otNodeId = `ot-${objectType}`;

    const color = getObjectColor(objectType);

    const otNode: Node = {
        id: otNodeId,
        type: 'abstractionOtNode',
        position: { x: xOffset, y: otY },
        data: { objectType, color },
        width: OT_NODE_SIZE,
        height: OT_NODE_SIZE,
    };

    // ── Event nodes: dagre center → ReactFlow top-left ───────────────────────
    const evNodes: Node[] = eventTypes.map((eventType) => {
        const { x, y } = g.node(eventType);
        return {
            id: `ev-${objectType}-${eventType}`,
            type: 'abstractionEvNode',
            position: {
                x: evXOffset + x - EV_NODE_WIDTH / 2,
                y: y - EV_NODE_HEIGHT / 2,
            },
            data: {
                eventName: eventType,
                color,
                isStartEvent: abstraction.start_ev_type_per_ob_type[objectType]?.includes(eventType) ?? false,
                isEndEvent: abstraction.end_ev_type_per_ob_type[objectType]?.includes(eventType) ?? false,
            },
        };
    });

    // ── Edges ─────────────────────────────────────────────────────────────────
    const dfEdges: Edge<AbstractionDfEdgeData>[] = dfRelations.map(([from, to]) => ({
        id: `df-${objectType}-${from}-${to}`,
        source: `ev-${objectType}-${from}`,
        target: `ev-${objectType}-${to}`,
        type: 'abstractionDfEdge',
        data: {
            objectType,
            color,
            loopSide: from === to ? bestLoopSide(from, dfRelations, g) : undefined,
        },
    }));

    const otEvEdges: Edge<AbstractionOtEvEdgeData>[] = eventTypes.map((eventType) => ({
        id: `otev-${objectType}-${eventType}`,
        source: otNodeId,
        sourceHandle: `${otNodeId}-out`,
        target: `ev-${objectType}-${eventType}`,
        targetHandle: 'otev-target',
        type: 'abstractionOtEvEdge',
        data: { objectType, color },
    }));

    const groupWidth = OT_NODE_SIZE + OT_TO_EV_GAP + dagreGraphWidth + GROUP_GAP;

    return {
        nodes: [otNode, ...evNodes],
        edges: [...dfEdges, ...otEvEdges],
        groupWidth,
    };
};
