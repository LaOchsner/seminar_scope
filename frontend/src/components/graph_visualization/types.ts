import { ExploreFileNodeType } from '~/types/explore/nodeTypesCategories';

export type NodeDatum = {
    id: string;
    label: string;
    type: 'event' | 'object';
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
};

export type EdgeDatum = {
    id: string;
    source: NodeDatum;
    target: NodeDatum;
    label: string;
};

export interface OcelVisualizationD3Props {
    fileId: string;
    nodeId: string;
    sourceType?: Extract<ExploreFileNodeType, 'ocelFileNode' | 'ocelCollectionNode'>;
    isFullScreen?: boolean;
}

export type ContextMenuState = {
    x: number;
    y: number;
    node: NodeDatum;
} | null;
