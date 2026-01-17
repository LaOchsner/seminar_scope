import { useEffect, useRef } from 'react';
import { type Connection } from '@xyflow/react';
import { isEqual } from 'lodash-es';
import { assetTypeToNodeType, isMinerNode } from '~/lib/explore/exploreNodes.utils';
import { Logger } from '~/lib/logger';
import { NodeFactory } from '~/model/explore/node-factory.model';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { BaseExploreNodeAsset } from '~/types/explore/nodeData/baseNodeData';

const logger = Logger.getInstance();

export const useMinerReactions = () => {
    const { nodes, edges, addNode, onConnect, removeNode } = useExploreFlowStore();
    
    // Track previous miner assets to detect changes
    // Map: NodeID -> Array of Assets
    const prevMinerAssetsRef = useRef<Map<string, BaseExploreNodeAsset[]>>(new Map());

    useEffect(() => {
        // Filter only miner nodes
        const minerNodes = nodes.filter(isMinerNode);

        minerNodes.forEach((node) => {
            const currentAssets = node.data.assets;
            const prevAssets = prevMinerAssetsRef.current.get(node.id) || [];

            // Skip if no change
            if (isEqual(currentAssets, prevAssets)) return;

            logger.debug(`Assets have changed for miner node ${node.id}`, prevAssets, currentAssets);

            // Handle removed assets (Clean up downstream nodes)
            const removedAssets = prevAssets.filter(
                (oldAsset) => !currentAssets.some((newAsset) => isEqual(newAsset, oldAsset))
            );

            removedAssets.forEach((removedAsset) => {
                if (removedAsset.io === 'output') {
                    // Find neighbors that were created from this asset using Edges
                    const outgoingEdges = edges.filter((e) => e.source === node.id);

                    const neighborsToDelete = outgoingEdges
                        .map((e) => nodes.find((n) => n.id === e.target))
                        .filter((neighbor) => {
                            // Only delete if the neighbor actually received this specific asset as input
                            return neighbor?.data.assets.some(
                                (asset: BaseExploreNodeAsset) =>
                                    asset.id === removedAsset.id && asset.io === 'input'
                            );
                        });

                    neighborsToDelete.forEach((neighbor) => {
                        if (neighbor) removeNode(neighbor.id);
                    });
                }
            });

            // Handle new assets (Spawn new nodes)
            const newAssets = currentAssets.filter(
                (newAsset) => !prevAssets.some((oldAsset) => isEqual(newAsset, oldAsset))
            );
            
            const newOutputAssets = newAssets.filter((asset) => asset.io === 'output');

            newOutputAssets.forEach((asset, index) => {
                const nodeType = assetTypeToNodeType(asset.type);

                if (nodeType) {
                    const newNodePosition = {
                        x: node.position.x + 400,
                        y: node.position.y + index * 150,
                    };

                    const newNode = NodeFactory.createNode(newNodePosition, nodeType);
                    // Explicitly set the initial assets
                    newNode.data.assets = [{ ...asset, io: 'output' }];

                    addNode(newNode);

                    // Connect the original node to the new one
                    const connection: Connection = {
                        source: node.id,
                        target: newNode.id,
                        sourceHandle: null,
                        targetHandle: null,
                    };
                    onConnect(connection);
                }
            });

            // Update the ref with current assets for next comparison
            prevMinerAssetsRef.current.set(node.id, currentAssets);
        });

        // Cleanup: Remove entries for deleted nodes from the Ref map
        // This is important to prevent memory leaks in long sessions
        const currentNodeIds = new Set(nodes.map(n => n.id));
        for (const id of prevMinerAssetsRef.current.keys()) {
            if (!currentNodeIds.has(id)) {
                prevMinerAssetsRef.current.delete(id);
            }
        }

    }, [nodes, edges, addNode, onConnect, removeNode]); // Re-run when nodes array changes (which happens on updateNodeData)
};
