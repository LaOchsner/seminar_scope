import { BaseExploreNodeData } from '~/types/explore/nodeData/baseNodeData';
import { JSONSchema } from '~/types/ocpt/ocpt.types';

export interface VisualizationExploreNodeData extends BaseExploreNodeData {
    processedData: undefined | JSONSchema;
    viewState?: {
        filteredObjectTypes: string[];
        colorScale: { domain: string[]; range: string[] };
        /** Flat map of objectType → HSL color string (used by OCEL nodes) */
        colorMap?: Record<string, string>;
    };
}
