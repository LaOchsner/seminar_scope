import { useCallback, MutableRefObject } from 'react';
import { type Connection, type NodeChange } from '@xyflow/react';
import { isEqual } from 'lodash-es';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { assetTypeToNodeType, isFileNode, isMinerNode, isVisualizationNode } from '~/lib/explore/exploreNodes.utils';
import { Logger } from '~/lib/logger';
import { BaseExploreNodeAsset } from '~/types/explore/nodeData/baseNodeData';
import { ExploreNodeData } from '~/types/explore/nodes';
import { NodeId } from '~/types/explore/nodeTypesCategories';
import { NodeFactory } from '~/model/explore/node-factory.model';

const logger = Logger.getInstance();

export const useNodeOperations = (
    directedNeighborMap: MutableRefObject<Map<NodeId, NodeId[]>>
) => {
    const {
        nodes,
        edges,
        onConnect,
        onNodesChange: storeOnNodesChange,
        setNodes,
        updateNodeData,
        addNode,
        removeNode: removeStoreNode,
        getNode,
    } = useExploreFlowStore();

    const onNodeDelete = useCallback(
        (nodeId: string) => {
            const nodeToDelete = getNode(nodeId);
            if (!nodeToDelete) return;

            // If it's a file node, remove its assets from connected visualization nodes
            if (isFileNode(nodeToDelete)) {
                // Find all edges where this node is the source
                const outgoingEdges = edges.filter((edge) => edge.source === nodeId);

                // Update connected visualization nodes
                outgoingEdges.forEach((edge) => {
                    const targetNode = getNode(edge.target);
                    if (targetNode && isVisualizationNode(targetNode)) {
                        // Filter out assets that came from the deleted file node
                        const filteredAssets = targetNode.data.assets.filter(
                            (asset) => !nodeToDelete.data.assets.some((sourceAsset) => sourceAsset.id === asset.id)
                        );

                        updateNodeData(edge.target, { assets: filteredAssets });
                    }
                });

                // Remove from neighbor map
                directedNeighborMap.current.delete(nodeId);

                // Remove this node from other nodes' neighbor maps
                for (const [sourceId, neighbors] of directedNeighborMap.current.entries()) {
                    if (neighbors.includes(nodeId)) {
                        const updatedNeighbors = neighbors.filter((id) => id !== nodeId);
                        if (updatedNeighbors.length > 0) {
                            directedNeighborMap.current.set(sourceId, updatedNeighbors);
                        } else {
                            directedNeighborMap.current.delete(sourceId);
                        }
                    }
                }
            }

            // Remove the node (this also removes connected edges)
            removeStoreNode(nodeId);
        },
        [getNode, edges, updateNodeData, removeStoreNode, directedNeighborMap]
    );

    const onNodeDataChange = useCallback(
        (id: string, newData: Partial<ExploreNodeData>) => {
            try {
                const node = getNode(id);
                if (!node) throw new Error(`Could not find node for id: ${id}`);

                const currentAssets: BaseExploreNodeAsset[] = node.data.assets;

                // Only proceed if assets actually changed
                if (!isEqual(currentAssets, newData.assets)) {
                    logger.debug(`Assets have changed for node ${id}`, currentAssets, newData.assets);

                    // Update the original node
                    updateNodeData(id, newData);

                    if (isMinerNode(node)) {
                        const neighbors = directedNeighborMap.current.get(id) || [];

                        // Handle removed assets
                        const removedAssets = currentAssets.filter(
                            (oldAsset) => !newData.assets?.some((newAsset) => isEqual(newAsset, oldAsset))
                        );

                        removedAssets.forEach((removedAsset) => {
                            if (removedAsset.io === 'output') {
                                // Find neighbors that were created from this asset
                                const neighborsToDelete = neighbors.filter((neighborId) => {
                                    const neighborNode = getNode(neighborId);
                                    return neighborNode?.data.assets.some(
                                        (asset: BaseExploreNodeAsset) =>
                                            asset.id === removedAsset.id && asset.io === 'output'
                                    );
                                });

                                // Delete identified neighbors
                                neighborsToDelete.forEach((neighborId) => {
                                    onNodeDelete(neighborId);
                                });
                            }
                        });

                        // Handle new assets
                        const newAssets =
                            newData.assets?.filter(
                                (newAsset) => !currentAssets.some((oldAsset) => isEqual(newAsset, oldAsset))
                            ) ?? [];

                        const newOutputAssets = newAssets.filter((asset) => asset.io === 'output');

                        newOutputAssets.forEach((asset, index) => {
                            const nodeType = assetTypeToNodeType(asset.type);

                            if (nodeType) {
                                const newNodePosition = {
                                    x: node.position.x + 400,
                                    y: node.position.y + index * 150,
                                };

                                const newNode = NodeFactory.createNode(newNodePosition, nodeType);
                                newNode.data.onDataChange = onNodeDataChange;
                                newNode.data.assets = [{ ...asset, io: 'output' }];

                                addNode(newNode);

                                // Connect the original node to the new one
                                const connection: Connection = {
                                    source: id,
                                    target: newNode.id,
                                    sourceHandle: null,
                                    targetHandle: null,
                                };
                                onConnect(connection);

                                // Refresh neighbors list as it might have changed due to deletions
                                const currentNeighbors = directedNeighborMap.current.get(id) || [];
                                if (!currentNeighbors.includes(newNode.id)) {
                                    directedNeighborMap.current.set(id, [...currentNeighbors, newNode.id]);
                                }
                            }
                        });
                    }
                } else {
                    // Assets have not changed — just update the node data
                    updateNodeData(id, newData);
                }
            } catch (err) {
                logger.error(err);
            }
        },
        [getNode, updateNodeData, addNode, onConnect, directedNeighborMap, onNodeDelete]
    );

    // Custom onNodesChange that handles node deletion with asset cleanup
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            // Check for remove changes and handle them specially
            const removeChanges = changes.filter((change) => change.type === 'remove');

            // Handle node deletions with asset cleanup
            removeChanges.forEach((change) => {
                if (change.type === 'remove') {
                    onNodeDelete(change.id);
                }
            });

            // Apply all other changes normally
            const otherChanges = changes.filter((change) => change.type !== 'remove');
            if (otherChanges.length > 0) {
                storeOnNodesChange(otherChanges);
            }
        },
        [onNodeDelete, storeOnNodesChange]
    );

    return {
        onNodeDataChange,
        onNodeDelete,
        onNodesChange,
    };
};
