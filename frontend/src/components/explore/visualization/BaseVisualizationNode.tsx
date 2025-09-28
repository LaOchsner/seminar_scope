import { memo } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '~/components/ui/button';
import BaseExploreNode from '~/components/explore/BaseExploreNode';
import { isFullVisualizationData } from '~/lib/explore/exploreNodes.utils';
import type {
    BaseExploreNodeDropdownActionType,
    BaseExploreNodeDropdownOption,
    BaseExploreNodeHandleOption,
    TVisualizationNode,
} from '~/types/explore';

interface VisualizationNodeProps {
    id: string;
    selected: boolean;
    data: TVisualizationNode['data'];
    title: string;
    iconName: string;
    handleOptions: BaseExploreNodeHandleOption[];
    dropdownOptions: BaseExploreNodeDropdownOption[];
    visualize: () => void;
}

const BaseVisualizationNode = memo<VisualizationNodeProps>((props) => {
    const { id, selected, data, title, iconName, handleOptions, dropdownOptions, visualize } = props;
    const { assets } = data;

    const handleDropdownAction = (action: BaseExploreNodeDropdownActionType) => {
        switch (action) {
            case 'openFileDialog':
                // Visualization nodes might not need file dialogs, or handle differently
                break;
            case 'changeSourceFile':
                // Handle source file change for visualization
                break;
        }
    };

    const renderVisualizationActions = () => {
        if (assets.length === 1 && isFullVisualizationData(data)) {
            return (
                <Button
                    onClick={visualize}
                    className="flex items-center h-6 px-2 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-md"
                >
                    <div className="">
                        <Eye className="h-2.5 w-2.5 text-blue-600" />
                    </div>
                    <span className="text-xs text-blue-600">View</span>
                </Button>
            );
        }
        return null;
    };

    const renderVisualizationContent = () => {
        if (assets.length >= 2) {
            return <div>Error: Multiple input files! Please select input file manually</div>;
        }

        if (assets.length === 0) {
            return <p>No input data connected</p>;
        }

        return (
            <div>
                <p>Ready to visualize: {assets.length} input</p>
                {assets.map((asset, index) => (
                    <div key={index} className="text-sm text-gray-600">
                        Input {index + 1}: {asset.name}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <BaseExploreNode
            id={id}
            selected={selected}
            title={title}
            iconName={iconName}
            handleOptions={handleOptions}
            dropdownOptions={dropdownOptions}
            onDropdownAction={handleDropdownAction}
            customActions={renderVisualizationActions()}
            customContent={renderVisualizationContent()}
        />
    );
});

export default BaseVisualizationNode;
