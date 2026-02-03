import type { DragEvent, ElementType } from 'react';
import { useDnD } from '~/components/explore/DndContext';
import { ExploreNodeType } from '~/types/explore/nodeTypesCategories';

interface DndCardProps {
    title: string;
    Icon: ElementType;
    nodeType: ExploreNodeType;
}

const DndCard: React.FC<DndCardProps> = ({ title, Icon, nodeType }) => {
    const [, setType] = useDnD();

    const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: ExploreNodeType) => {
        setType(nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            onDragStart={(event) => onDragStart(event, nodeType)}
            draggable
            className="flex flex-col items-center justify-center space-y-1 w-16 h-16 rounded-lg border-[1px] border-gray-400 p-1"
        >
            <p className="w-full text-[12px] font-bold text-center leading-none">{title}</p>
            <Icon className="h-4 w-4" />
        </div>
    );
};

export default DndCard;
