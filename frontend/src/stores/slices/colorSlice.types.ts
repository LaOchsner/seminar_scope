export interface ColorSlice {
    // Initialize colors specifically for a node and store them in that node's data
    initializeDataState: (nodeId: string, objectTypes: string[]) => void;
    // Retrieve color from the node's data
    getColorForNode: (nodeId: string, objectType: string) => string;
    setNodeColor: (nodeId: string, objectType: string, newColor: string) => void;
    // --- End Color State ---
}
