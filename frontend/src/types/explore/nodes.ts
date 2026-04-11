import type { Node } from '@xyflow/react';
import { FileExploreNodeData } from '~/types/explore/nodeData/fileNodeData';
import { MinerExploreNodeData } from '~/types/explore/nodeData/minerNodeData';
import type { ExploreFileNodeType, ExploreMinerNodeType } from '~/types/explore/nodeTypesCategories';

export interface FileNode extends Node<FileExploreNodeData> {
    data: FileExploreNodeData & { nodeType: ExploreFileNodeType; nodeCategory: 'file' };
}

export interface MinerNode extends Node<MinerExploreNodeData> {
    data: MinerExploreNodeData & { nodeType: ExploreMinerNodeType; nodeCategory: 'miner' };
}

export type ExploreNode = FileNode | MinerNode;
export type ExploreNodeData = FileExploreNodeData | MinerExploreNodeData;
