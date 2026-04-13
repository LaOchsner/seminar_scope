import type { Edge, Node } from '@xyflow/react';
import { GROUP_STRIDE, toObjectTypeGroup } from '~/components/abstraction/ObjectCentricDirectlyFollows';
import type { OCLanguageAbstraction } from '~/types/abstraction.types';

export const getObjectTypes = (abstraction: OCLanguageAbstraction): string[] =>
    Object.keys(abstraction.start_ev_type_per_ob_type);

export const toAbstractionFlow = (abstraction: OCLanguageAbstraction): { nodes: Node[]; edges: Edge[] } => {
    const objectTypes = getObjectTypes(abstraction);

    return objectTypes.reduce<{ nodes: Node[]; edges: Edge[] }>(
        (acc, objectType, index) => {
            const group = toObjectTypeGroup(objectType, abstraction, index * GROUP_STRIDE);
            acc.nodes.push(...group.nodes);
            acc.edges.push(...group.edges);
            return acc;
        },
        { nodes: [], edges: [] }
    );
};
