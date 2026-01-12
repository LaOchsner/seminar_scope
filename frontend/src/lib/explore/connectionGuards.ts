import { ExploreNode } from '~/types/explore/nodes';

export const isTwoFileNodes = (sourceNode: ExploreNode, targetNode: ExploreNode) => {
    const sourceCategory = sourceNode.data.nodeCategory;
    const targetCategory = targetNode.data.nodeCategory;

    if (sourceCategory === 'file' && targetCategory === 'file') return true;
    return false;
};

export const isTwoVisualizationNodes = (sourceNode: ExploreNode, targetNode: ExploreNode) => {
    const sourceCategory = sourceNode.data.nodeCategory;
    const targetCategory = targetNode.data.nodeCategory;

    if (sourceCategory === 'visualization' && targetCategory === 'visualization') return true;
    return false;
};
