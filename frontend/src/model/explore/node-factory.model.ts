import type { XYPosition } from '@xyflow/react';
import { nodeRegistry } from '~/lib/explore/nodeRegistry';
import type { FileExploreNodeData } from '~/types/explore/nodeData/fileNodeData';
import type { MinerExploreNodeData } from '~/types/explore/nodeData/minerNodeData';
import type { ExploreNode } from '~/types/explore/nodes';
import type {
    ExploreFileNodeType,
    ExploreMinerNodeType,
    ExploreNodeType,
    NodeId,
} from '~/types/explore/nodeTypesCategories';
import { assetTypes } from '~/types/files.types';

let idCounter = 0;
const generateId = (nodeType: ExploreNodeType): NodeId => `${nodeType}_${idCounter++}`;

export const createNode = (
    position: XYPosition,
    nodeType: ExploreNodeType,
    isDownstream: boolean = false
): ExploreNode => {
    const entry = nodeRegistry[nodeType as keyof typeof nodeRegistry];
    const category = entry?.category ?? 'miner';
    const allowedAssetTypes = entry?.allowedAssetTypes ?? assetTypes;
    const id = generateId(nodeType);
    const base = { id, type: nodeType, position };

    if (category === 'file') {
        const data: FileExploreNodeData & { nodeType: ExploreFileNodeType; nodeCategory: 'file' } = {
            nodeType: nodeType as ExploreFileNodeType,
            nodeCategory: 'file',
            assets: [],
            allowedAssetTypes,
            isDownstream,
            colorMap: () => '',
        };
        return { ...base, data };
    }

    const data: MinerExploreNodeData & { nodeType: ExploreMinerNodeType; nodeCategory: 'miner' } = {
        nodeType: nodeType as ExploreMinerNodeType,
        nodeCategory: 'miner',
        assets: [],
        allowedAssetTypes,
        colorMap: () => '',
    };
    return { ...base, data };
};

/** @deprecated use createNode directly */
export class NodeFactory {
    static createNode = createNode;
}
