// import { StateCreator } from 'zustand';
// import { ExploreFlowStore } from '~/stores/exploreStore';
// import { getDeterministicColor, getSequentialColor } from '~/lib/colors';
// import { FileExploreNodeData } from '~/types/explore/nodeData/fileNodeData';
// import { ColorSlice } from './colorSlice.types';

// export const createColorSlice: StateCreator<ExploreFlowStore, [], [], ColorSlice> = (set, get) => ({
//     initializeDataState: (nodeId: string, objectTypes: string[]) => {
//         const { getNode, updateNodeData } = get();
//         const node = getNode(nodeId);

//         if (!node) return;

//         // Cast data to any or generic interface containing color props
//         // to avoid TS errors until FileExploreNodeData is updated
//         const nodeData = node.data as FileExploreNodeData & {
//             colorMap?: Record<string, string>;
//             colorIndex?: number;
//         };

//         const currentMap = { ...(nodeData.colorMap || {}) };
//         let currentIndex = nodeData.colorIndex || 0;
//         let hasChanges = false;

//         const usedColors = new Set(Object.values(currentMap));
//         const uniqueTypes = Array.from(new Set(objectTypes));

//         uniqueTypes.forEach((type) => {
//             if (!currentMap[type]) {
//                 let color = '';
//                 let attempts = 0;
//                 // Find next available unique color
//                 do {
//                     color = getSequentialColor(currentIndex);
//                     currentIndex++;
//                     attempts++;
//                 } while (usedColors.has(color) && attempts < 100);

//                 currentMap[type] = color;
//                 usedColors.add(color);
//                 hasChanges = true;
//             }
//         });

//         if (hasChanges) {
//             updateNodeData(nodeId, {
//                 colorMap: currentMap,
//                 colorIndex: currentIndex,
//             } as any);
//         }
//     },

//     getColorForNode: (nodeId: string, objectType: string): string => {
//         const node = get().getNode(nodeId);
//         if (!node) return getDeterministicColor(objectType);

//         const nodeData = node.data as FileExploreNodeData & { colorMap?: Record<string, string> };
//         const colorMap = nodeData.colorMap;

//         if (colorMap && colorMap[objectType]) {
//             return colorMap[objectType];
//         }

//         return getDeterministicColor(objectType);
//     },
//     setNodeColor: (nodeId: string, objectType: string, newColor: string) => {
//         const { getNode, updateNodeData } = get();
//         const node = getNode(nodeId);

//         if (!node) return;

//         // Cast to your node data type
//         const nodeData = node.data as FileExploreNodeData;

//         // Create a copy of the existing map
//         const updatedMap = { ...(nodeData.colorMap || {}) };

//         // Update the specific color
//         updatedMap[objectType] = newColor;

//         // Write back to the node (Triggers re-render in Graph/Histograms)
//         updateNodeData(nodeId, {
//             colorMap: updatedMap,
//         } as any);
//     },
// });
