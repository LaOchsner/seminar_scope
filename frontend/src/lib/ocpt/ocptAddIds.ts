import { type Node, type NodeWithoutId } from '~/types/ocpt/ocpt.types';

let nodeIdCounter = 0;

export const addIdsToTree = (jsonTreeData: NodeWithoutId): Node => {
    nodeIdCounter = 0;

    function addIdsRecursively(jsonNode: NodeWithoutId): Node {
        return {
            id: nodeIdCounter++,
            value: jsonNode.value,
            isExpanded: jsonNode.isExpanded,
            children: jsonNode.children?.map(addIdsRecursively),
        };
    }

    return addIdsRecursively(jsonTreeData);
};
