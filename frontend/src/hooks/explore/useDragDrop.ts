import { DragEvent, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { useFileDialogStore } from '~/stores/store';
import { isFileNode } from '~/lib/explore/exploreNodes.utils';
import { ExploreNodeType } from '~/types/explore/nodeTypesCategories';
import { createNode } from '~/lib/explore/createNode';

export const useDragDrop = () => {
    const { addNode } = useExploreFlowStore();
    const { openDialog } = useFileDialogStore();
    const { screenToFlowPosition } = useReactFlow();

    /**
     * For the visual effect of dragging the node.
     */
    const onDragOver = useCallback((event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    /**
     * Handles the creation of a new node within the graph when dropping the node in the region of the flow component.
     * Assigns the category dependent attributes to each node.
     */
    const onDrop = useCallback(
        (event: DragEvent<HTMLElement>, type: ExploreNodeType | null) => {
            event.preventDefault();

            if (!type) {
                return;
            }

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            // Constructs a new node using a factory where the logic is handled
            // on determining whether it is a 'file', 'visualization', ... node
            const newNode = createNode(position, type);

            // This statement opens the 'File Selection Dialog' automatically
            // if the node received is a FileNode.
            if (isFileNode(newNode)) {
                openDialog(newNode.id);
            }

            addNode(newNode);
        },
        [screenToFlowPosition, addNode, openDialog]
    );

    return {
        onDragOver,
        onDrop,
    };
};
