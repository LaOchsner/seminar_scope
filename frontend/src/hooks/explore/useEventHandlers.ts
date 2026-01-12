import { useRef } from 'react';
import { NodeId } from '~/types/explore/nodeTypesCategories';
// Relative imports here to avoid the ESLint warning.
// These should never be imported by themselves in another file.
import { useConnections } from './useConnections';
import { useDragDrop } from './useDragDrop';
import { useNodeOperations } from './useNodeOperations';

export const useEventHandlers = () => {
    const directedNeighborMap = useRef(new Map<NodeId, NodeId[]>());

    const { onNodeDataChange, onNodeDelete, onNodesChange } = useNodeOperations(directedNeighborMap);

    const { handleConnect, isValidConnection, onEdgeDelete } = useConnections(directedNeighborMap);

    const { onDragOver, onDrop } = useDragDrop(onNodeDataChange);

    return {
        onNodeDataChange,
        onNodesChange,
        onEdgeDelete,
        onNodeDelete,
        onDragOver,
        onDrop,
        handleConnect,
        isValidConnection,
    };
};
