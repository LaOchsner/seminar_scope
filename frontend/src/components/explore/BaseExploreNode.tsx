import { memo, ReactNode, useState } from 'react';
import { Handle } from '@xyflow/react';
import { Settings } from 'lucide-react';
import { BaseNode } from '~/components/ui/base-node';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '~/components/ui/dropdown-menu';
import {
    NodeHeader,
    NodeHeaderActions,
    NodeHeaderDeleteAction,
    NodeHeaderIcon,
    NodeHeaderMenuAction,
    NodeHeaderTitle,
} from '~/components/ui/node-header';
import { ColorCustomizationDialog } from '~/components/ColorCustomizationDialog';
import { getIconComponent } from '~/lib/iconMap';
import {
    BaseExploreNodeDropdownActionType,
    BaseExploreNodeDropdownOption,
    BaseExploreNodeHandleOption,
} from '~/types/explore/nodeData/baseNodeData';

interface BaseExploreNodeProps {
    id: string;
    selected: boolean;
    title: string;
    iconName: string;
    handleOptions: BaseExploreNodeHandleOption[];
    dropdownOptions: BaseExploreNodeDropdownOption[];
    children?: ReactNode;
    customActions?: ReactNode;
    customContent?: ReactNode;
    onDropdownAction?: (action: BaseExploreNodeDropdownActionType) => void;
}
const BaseExploreNode = memo<BaseExploreNodeProps>(
    ({
        id,
        selected,
        title,
        iconName,
        handleOptions,
        dropdownOptions,
        children,
        customActions,
        customContent,
        onDropdownAction,
    }) => {
        const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
        const handleDropdownAction = (action: BaseExploreNodeDropdownActionType) => {
            if (onDropdownAction) {
                onDropdownAction(action);
            }
        };
        return (
            <>
                {/* --- Render the Dialog Component (It stays hidden until triggered) --- */}
                <ColorCustomizationDialog
                    isOpen={isColorDialogOpen}
                    onClose={() => setIsColorDialogOpen(false)}
                    nodeId={id}
                />
                <BaseNode key={id} selected={selected} className="px-3 py-2">
                    <NodeHeader className="-mx-3 -mt-2 border-b">
                        <NodeHeaderIcon>
                            {(() => {
                                const IconComponent = getIconComponent(iconName);
                                return <IconComponent />;
                            })()}
                        </NodeHeaderIcon>
                        <NodeHeaderTitle>{title}</NodeHeaderTitle>
                        <NodeHeaderActions>
                            {customActions}
                            <NodeHeaderMenuAction label="Expand options">
                                <DropdownMenuLabel className="flex items-center">
                                    <Settings className="w-4 h-4" />
                                    <span className="ml-1">Options</span>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {dropdownOptions.map((ddOpt, index) => {
                                    const IconComponent = ddOpt.icon ? getIconComponent(ddOpt.icon) : null;
                                    const isColorAction = ddOpt.action === 'SetCustomColor';
                                    const handleClick = (e: React.MouseEvent) => {
                                        if (isColorAction) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsColorDialogOpen(true);
                                        } else {
                                            handleDropdownAction(ddOpt.action);
                                        }
                                    };
                                    return (
                                        <DropdownMenuItem
                                            key={`${id}-${ddOpt.label}-${index}`}
                                            onClick={handleClick}
                                            className="flex items-center cursor-pointer"
                                        >
                                            {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
                                            {ddOpt.label}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </NodeHeaderMenuAction>
                            <NodeHeaderDeleteAction />
                        </NodeHeaderActions>
                    </NodeHeader>
                    <div className="mt-2">{customContent || <p>empty</p>}</div>
                    {handleOptions.map((handleOption, index) => (
                        <Handle
                            key={`${id}-${handleOption.type}-${index}`}
                            position={handleOption.position}
                            type={handleOption.type}
                        />
                    ))}
                    {children}
                </BaseNode>
            </>
        );
    }
);
export default BaseExploreNode;
