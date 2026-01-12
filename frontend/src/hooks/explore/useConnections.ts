import { MutableRefObject, type MouseEvent as ReactMouseEvent, useCallback } from 'react';
import { type Connection, type Edge, type IsValidConnection } from '@xyflow/react';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { isTwoFileNodes, isTwoVisualizationNodes } from '~/lib/explore/connectionGuards';
import { Logger } from '~/lib/logger';
import { BaseExploreNodeAsset } from '~/types/explore/nodeData/baseNodeData';
import { ExploreNodeData } from '~/types/explore/nodes';
import { NodeId } from '~/types/explore/nodeTypesCategories';

const logger = Logger.getInstance();

export const useConnections = (directedNeighborMap: MutableRefObject<Map<NodeId, NodeId[]>>) => {
    const { onConnect, removeEdge: removeStoreEdge, getNode, updateNodeData } = useExploreFlowStore();

    /**
     * Handles the edge deletion logic.
     * This not only deletes the edge between two nodes within the graph but also manipulates
     * the 'node.data' object by removing all incoming assets received from
     * neighboring nodes.
     */
    const onEdgeDelete = useCallback(
        (event: ReactMouseEvent, edge: Edge) => {
            // Prevents the click event from propagating to the Graph and Window level.
            event.stopPropagation();

            const sourceNode = getNode(edge.source);
            const targetNode = getNode(edge.target);

            if (!sourceNode || !targetNode) {
                logger.error(
                    `Edge Deletion Error: Could not delete the propagated assets due to unknown source node ID ${edge.source} or unknown target node ID ${edge.target}`
                );
                return;
            }

            // Remove assets which were received from the incoming neighboring nodes
            const filteredAssets = targetNode.data.assets.filter(
                (asset: BaseExploreNodeAsset) =>
                    !sourceNode.data.assets.some((sourceAsset: BaseExploreNodeAsset) => sourceAsset.id === asset.id)
            );
            const updatedData: ExploreNodeData = {
                ...targetNode.data,
                assets: filteredAssets,
            };
            updateNodeData(edge.target, updatedData);

            // Remove the connection from the directedNeighborMap
            const neighbors = directedNeighborMap.current.get(edge.source) || [];
            const updatedNeighbors = neighbors.filter((id) => id !== edge.target);
            if (updatedNeighbors.length > 0) {
                directedNeighborMap.current.set(edge.source, updatedNeighbors);
            } else {
                directedNeighborMap.current.delete(edge.source);
            }

            // Remove the edge from the store
            removeStoreEdge(edge.id);
        },
        [removeStoreEdge, getNode, directedNeighborMap, updateNodeData]
    );

    /**
     * Makes sure that the connection between nodes are valid with respect to the business logic.
     * Example 1: Two visualization nodes may not be connected with each other.
     * Example 2: An OCPT File may not be connected with the OCPT Miner.
     */
    const isValidConnection: IsValidConnection = useCallback(
        (connection: Edge | Connection) => {
            const sourceNode = getNode(connection.source);
            const targetNode = getNode(connection.target);
            if (!sourceNode || !targetNode) {
                logger.error(
                    `Valid Connection Check Error: Couldn't find source node with id ${connection.source} or couldn't find target node with id ${connection.target}`
                );
                return false;
            }

            // Prevent connecting two file nodes
            if (isTwoFileNodes(sourceNode, targetNode)) {
                return false;
            }
            // Prevent connecting two visualization nodes
            if (isTwoVisualizationNodes(sourceNode, targetNode)) {
                return false;
            }
            // Add more validation rules here as needed
            return true;
        },
        [getNode]
    );

    /**
     * Handles the edge conneciton logic.
     * This not only connects the edges between two nodes within the graph but also manipulates
     * the 'node.data' object by adding all incoming assets received from
     * neighboring nodes.
     */
    const handleConnect = useCallback(
        (connection: Connection) => {
            const { source, target } = connection;
            const sourceNode = getNode(source);
            const targetNode = getNode(target);

            if (!sourceNode || !targetNode) {
                logger.error(`Handle Connect Error: Did not find source node (${source}) or target node (${target})`);
                return;
            }

            // Add assets from incoming neighbors to the target node
            const newAssets: BaseExploreNodeAsset[] = [
                ...(targetNode.data.assets || []), // Keep all assets the targetNode currently has
                ...(sourceNode.data.assets || []) // Only take the assets from the sourceNode as follows:
                    .filter((asset: BaseExploreNodeAsset) => asset.io === 'output') // Find all output assets from the sourceNode
                    .map((asset: BaseExploreNodeAsset) => ({
                        // Map these output assets to input assets in the targetNode
                        ...asset,
                        io: 'input' as const,
                    })),
            ];
            updateNodeData(target, { assets: newAssets });

            // Add the connection from the directedNeighborMap
            const neighbors = directedNeighborMap.current.get(source) || [];
            if (!neighbors.includes(target)) {
                directedNeighborMap.current.set(source, [...neighbors, target]);
            }

            // Use the store's onConnect to handle the edge creation
            onConnect(connection);
        },
        [onConnect, directedNeighborMap, getNode, updateNodeData]
    );

    return {
        onEdgeDelete,
        isValidConnection,
        handleConnect,
    };
};
