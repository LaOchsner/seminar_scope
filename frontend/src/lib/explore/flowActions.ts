import { Connection } from '@xyflow/react';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { isFileNode } from '~/lib/explore/exploreNodes.utils';
import { BaseExploreNodeAsset } from '~/types/explore/nodeData/baseNodeData';
import { ExploreNodeType } from '~/types/explore/nodeTypesCategories';
import { AssetType } from '~/types/files.types';
import { NodeFactory } from '~/model/explore/node-factory.model';

function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
            .toString(16)
            .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function getDeterministicColor(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
        hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return hslToHex(hue, 65, 55);
}

export function generateColorMap(keys: string[]): Record<string, string> {
    const map: Record<string, string> = {};
    keys.forEach((key) => {
        map[key] = getDeterministicColor(key);
    });
    return map;
}

/**
 * Forces a complete Color Map to be copied to all downstream nodes recursively.
 */
export const propagateMapDownstream = (sourceNodeId: string, newMap: Record<string, string>) => {
    //  Get fresh state immediately
    const state = useExploreFlowStore.getState();
    const { nodes, edges, updateNodeData } = state;

    console.log(`[Propagation] Starting from Source: ${sourceNodeId}`);
    console.log(`[Propagation] Pushing Colors:`, newMap);

    const visited = new Set<string>();

    const propagate = (currentId: string) => {
        if (visited.has(currentId)) return;
        visited.add(currentId);

        // Find all edges pointing AWAY from the current node
        const outgoingEdges = edges.filter((e) => e.source === currentId);

        if (outgoingEdges.length === 0) {
            console.log(`[Propagation] Node ${currentId} has no outgoing edges. Stopping.`);
            return;
        }

        outgoingEdges.forEach((edge) => {
            const targetNode = nodes.find((n) => n.id === edge.target);

            if (targetNode) {
                console.log(`[Propagation] -> Updating Target Node: ${targetNode.id}`);

                // Update the Child Node
                updateNodeData(targetNode.id, (prev: any) => ({
                    colorMap: { ...(prev.colorMap || {}), ...newMap },
                }));

                // Recurse to children
                propagate(targetNode.id);
            } else {
                console.warn(`[Propagation] Found edge to ${edge.target} but node is missing in store.`);
            }
        });
    };

    propagate(sourceNodeId);
};

export const updateNodeColorAndPropagate = (nodeId: string, key: string, color: string) => {
    const { updateNodeData } = useExploreFlowStore.getState();
    updateNodeData(nodeId, (prev: any) => ({
        colorMap: { ...(prev.colorMap || {}), [key]: color },
    }));
    propagateMapDownstream(nodeId, { [key]: color });
};

export const handleConnect = (connection: Connection) => {
    const { source, target } = connection;
    const { updateNodeData, onConnect, getNode } = useExploreFlowStore.getState();

    const sourceNode = getNode(source);
    const targetNode = getNode(target);

    onConnect(connection);

    if (sourceNode && targetNode) {
        const propagatedAssets: BaseExploreNodeAsset[] = (sourceNode.data.assets || [])
            .filter((asset) => asset.io === 'output')
            .flatMap((asset) => {
                if (connection.targetHandle === 'conformanceTarget')
                    return [{ ...asset, io: 'input' } as BaseExploreNodeAsset];
                if (isFileNode(targetNode)) return [{ ...asset, io: 'output' } as BaseExploreNodeAsset];
                return [{ ...asset, io: 'input' } as BaseExploreNodeAsset];
            });

        const sourceColorMap = (sourceNode.data as any).colorMap as Record<string, string> | undefined;

        updateNodeData(target, (prev) => {
            const updates: any = {};
            if (propagatedAssets.length > 0) {
                const existingAssets = prev.assets || [];
                const uniqueNewAssets = propagatedAssets.filter(
                    (newAsset) => !existingAssets.some((e) => e.id === newAsset.id && e.io === newAsset.io)
                );
                updates.assets = [...existingAssets, ...uniqueNewAssets];
            }
            if (sourceColorMap) {
                const existingMap = (prev as any).colorMap || {};
                updates.colorMap = { ...existingMap, ...sourceColorMap };
            }
            return updates;
        });
    }
};

export const spawnDownstreamNode = (sourceNodeId: string, nodeType: ExploreNodeType) => {
    const { nodes, addNode } = useExploreFlowStore.getState();
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    const newNodePosition = { x: sourceNode.position.x + 400, y: sourceNode.position.y };
    const newNode = NodeFactory.createNode(newNodePosition, nodeType, true);
    addNode(newNode);

    handleConnect({ source: sourceNode.id, target: newNode.id, sourceHandle: 'source', targetHandle: 'target' });
};

export interface HandleMinerOutputParams {
    nodeId: string;
    outputAssetId: string | null | undefined;
    outputAssetType: AssetType;
    outputNodeType: ExploreNodeType;
    inputFileName: string;
}

export const handleMinerOutput = ({
    nodeId,
    outputAssetId,
    outputAssetType,
    outputNodeType,
    inputFileName,
}: HandleMinerOutputParams) => {
    if (!outputAssetId || !inputFileName) return;

    const { updateNodeData, getNode, edges, nodes } = useExploreFlowStore.getState();
    const node = getNode(nodeId);
    if (!node) return;

    const newAsset: BaseExploreNodeAsset = {
        id: outputAssetId,
        io: 'output',
        origin: 'mined',
        type: outputAssetType,
        name: inputFileName,
    };

    updateNodeData(nodeId, (prev) => {
        const currentAssets = prev.assets.filter((a) => a.io !== 'output');
        return { assets: [...currentAssets, newAsset] };
    });

    const existingEdge = edges.find((edge) => edge.source === nodeId);

    if (existingEdge) {
        const targetNode = nodes.find((n) => n.id === existingEdge.target);
        if (targetNode && targetNode.type === outputNodeType) {
            updateNodeData(targetNode.id, (prev: any) => {
                const otherAssets = prev.assets.filter((a: any) => a.io !== 'output');
                const sourceColorMap = (node.data as any).colorMap;
                const existingColorMap = prev.colorMap || {};
                const nextColorMap = sourceColorMap ? { ...existingColorMap, ...sourceColorMap } : existingColorMap;
                return {
                    assets: [...otherAssets, { ...newAsset, io: 'output' }],
                    colorMap: nextColorMap,
                };
            });
            // Force propagate here too just in case
            if ((node.data as any).colorMap) {
                propagateMapDownstream(nodeId, (node.data as any).colorMap);
            }
            return;
        }
    }

    spawnDownstreamNode(nodeId, outputNodeType);
};

export const pullUpstreamData = (targetNodeId: string) => {
    const { edges, getNode, updateNodeData } = useExploreFlowStore.getState();
    const targetNode = getNode(targetNodeId);
    if (!targetNode) return;

    const incomingEdges = edges.filter((edge) => edge.target === targetNodeId);
    if (incomingEdges.length === 0) return;

    const newAssets: BaseExploreNodeAsset[] = [];
    let mergedUpstreamColors: Record<string, string> = {};

    incomingEdges.forEach((edge) => {
        const sourceNode = getNode(edge.source);
        if (sourceNode) {
            const propagatedAssets = (sourceNode.data.assets || [])
                .filter((asset) => asset.io === 'output')
                .map((asset) => {
                    if (isFileNode(targetNode)) return { ...asset, io: 'output' } as BaseExploreNodeAsset;
                    return { ...asset, io: 'input' } as BaseExploreNodeAsset;
                });
            newAssets.push(...propagatedAssets);
            const sourceColors = (sourceNode.data as any).colorMap;
            if (sourceColors) mergedUpstreamColors = { ...mergedUpstreamColors, ...sourceColors };
        }
    });

    if (newAssets.length > 0 || Object.keys(mergedUpstreamColors).length > 0) {
        updateNodeData(targetNodeId, (prev: any) => {
            const updates: any = {};
            if (newAssets.length > 0) {
                const otherAssets = (prev.assets || []).filter((a: any) => a.io !== 'input');
                const uniqueNewAssets = newAssets.filter(
                    (newAsset, index, self) =>
                        index === self.findIndex((t) => t.id === newAsset.id && t.io === newAsset.io)
                );
                updates.assets = [...otherAssets, ...uniqueNewAssets];
            }
            if (Object.keys(mergedUpstreamColors).length > 0) {
                updates.colorMap = { ...(prev.colorMap || {}), ...mergedUpstreamColors };
            }
            return updates;
        });
    }
};
