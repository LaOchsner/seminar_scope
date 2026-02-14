import { StateCreator } from 'zustand';
import { ExploreFlowStore } from '~/stores/exploreStore';
import { HistogramSlice } from './histogramSlice.types';

export const createHistogramSlice: StateCreator<ExploreFlowStore, [], [], HistogramSlice> = (set, get) => ({
    histogramStates: {},
    setHistogramState: (nodeId, state) => {
        const { updateNodeData } = get();
        updateNodeData(nodeId, {
            histogramState: state,
        } as any);
    },
    clearHistogramState: (nodeId) => {
        const { updateNodeData } = get();
        updateNodeData(nodeId, {
            histogramState: undefined,
        } as any);
    },
});
