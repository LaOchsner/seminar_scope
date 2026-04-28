import type { Edge, Node } from '@xyflow/react';
import { toObjectTypeGroup } from '~/components/abstraction/ObjectCentricDirectlyFollows';
import type { DfgDiff } from '~/lib/abstraction/abstractionDiff';
import type { OCLanguageAbstraction } from '~/types/abstraction.types';

export const getObjectTypes = (abstraction: OCLanguageAbstraction): string[] =>
    Object.keys(abstraction.start_ev_type_per_ob_type);

export const toAbstractionFlow = (
    abstraction: OCLanguageAbstraction,
    getObjectColor: (objectType: string) => string,
    filteredObjectTypes: string[],
    diffInfo?: DfgDiff
): { nodes: Node[]; edges: Edge[] } => {
    const allObjectTypes = getObjectTypes(abstraction);
    const objectTypes = filteredObjectTypes.length > 0
        ? allObjectTypes.filter((ot) => filteredObjectTypes.includes(ot))
        : allObjectTypes;
    const result: { nodes: Node[]; edges: Edge[] } = { nodes: [], edges: [] };
    let xOffset = 0;

    for (const objectType of objectTypes) {
        const { nodes, edges, groupWidth } = toObjectTypeGroup(objectType, abstraction, xOffset, getObjectColor, diffInfo);
        result.nodes.push(...nodes);
        result.edges.push(...edges);
        xOffset += groupWidth;
    }

    return result;
};
