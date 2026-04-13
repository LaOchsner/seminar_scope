import type { Edge, Node } from '@xyflow/react';
import type { AbstractionDfEdgeData } from '~/components/abstraction/edges/AbstractionDfEdge';
import type { AbstractionOtEvEdgeData } from '~/components/abstraction/edges/AbstractionOtEvEdge';
import type { OCLanguageAbstraction } from '~/types/abstraction.types';

export const OT_NODE_SIZE = 80;
const EV_ROW_HEIGHT = 60;
const OT_TO_EV_GAP = 80;
const EV_NODE_WIDTH = 160;
const GROUP_GAP = 100;

export const GROUP_STRIDE = OT_NODE_SIZE + OT_TO_EV_GAP + EV_NODE_WIDTH + GROUP_GAP;

export const toObjectTypeGroup = (
    objectType: string,
    abstraction: OCLanguageAbstraction,
    xOffset: number
): { nodes: Node[]; edges: Edge[] } => {
    const dfRelations = abstraction.directly_follows_ev_types_per_ob_type[objectType] ?? [];

    const eventTypes = Array.from(new Set(dfRelations.flatMap(([from, to]) => [from, to]))).sort();

    const evX = xOffset + OT_NODE_SIZE + OT_TO_EV_GAP;
    const totalHeight = Math.max(eventTypes.length - 1, 0) * EV_ROW_HEIGHT;
    const otY = totalHeight / 2 - OT_NODE_SIZE / 2;

    const otNodeId = `ot-${objectType}`;

    const otNode: Node = {
        id: otNodeId,
        type: 'abstractionOtNode',
        position: { x: xOffset, y: otY },
        data: { objectType },
        width: OT_NODE_SIZE,
        height: OT_NODE_SIZE,
    };

    const evNodes: Node[] = eventTypes.map((eventType, index) => ({
        id: `ev-${objectType}-${eventType}`,
        type: 'abstractionEvNode',
        position: { x: evX, y: index * EV_ROW_HEIGHT },
        data: {
            eventName: eventType,
            isStartEvent: abstraction.start_ev_type_per_ob_type[objectType]?.includes(eventType) ?? false,
            isEndEvent: abstraction.end_ev_type_per_ob_type[objectType]?.includes(eventType) ?? false,
        },
    }));

    const dfEdges: Edge<AbstractionDfEdgeData>[] = dfRelations.map(([from, to]) => ({
        id: `df-${objectType}-${from}-${to}`,
        source: `ev-${objectType}-${from}`,
        target: `ev-${objectType}-${to}`,
        type: 'abstractionDfEdge',
        data: { objectType },
    }));

    const otEvEdges: Edge<AbstractionOtEvEdgeData>[] = eventTypes.map((eventType) => ({
        id: `otev-${objectType}-${eventType}`,
        source: otNodeId,
        sourceHandle: `${otNodeId}-out`,
        target: `ev-${objectType}-${eventType}`,
        type: 'abstractionOtEvEdge',
        data: { objectType },
    }));

    return {
        nodes: [otNode, ...evNodes],
        edges: [...dfEdges, ...otEvEdges],
    };
};
