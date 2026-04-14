import type { Edge, Node } from '@xyflow/react';
import { toObjectTypeGroup } from '~/components/abstraction/ObjectCentricDirectlyFollows';
import type { OCLanguageAbstraction } from '~/types/abstraction.types';

export const getObjectTypes = (abstraction: OCLanguageAbstraction): string[] =>
    Object.keys(abstraction.start_ev_type_per_ob_type);

export const toAbstractionFlow = (
    abstraction: OCLanguageAbstraction,
    getObjectColor?: (objectType: string) => string
): { nodes: Node[]; edges: Edge[] } => {
    const objectTypes = getObjectTypes(abstraction);
    const result: { nodes: Node[]; edges: Edge[] } = { nodes: [], edges: [] };
    let xOffset = 0;

    for (const objectType of objectTypes) {
        const { nodes, edges, groupWidth } = toObjectTypeGroup(objectType, abstraction, xOffset, getObjectColor);
        result.nodes.push(...nodes);
        result.edges.push(...edges);
        xOffset += groupWidth;
    }

    return result;
};
