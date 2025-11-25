import type { ComponentType } from 'react';
import {
    Activity,
    Database,
    FileJson,
    FileSpreadsheet,
    FileText,
    Grip,
    type LucideProps,
    Network,
    TreePine,
    Workflow,
} from 'lucide-react';
import type { FileType } from '~/types/files.types';

export const iconMap: Record<string, ComponentType<LucideProps>> = {
    database: Database,
    fileText: FileText,
    workflow: Workflow,
    activity: Activity,
    fileSpreadsheet: FileSpreadsheet,
    fileJson: FileJson,
    treePine: TreePine,
    network: Network,
    grip: Grip,
};

export const getIconComponent = (iconName: string): ComponentType<LucideProps> => {
    return iconMap[iconName] || FileText; // Default to FileText if icon not found
};

interface AssetTypeVisual {
    icon: ComponentType<LucideProps>;
    color: string;
}

export const ASSET_TYPE_VISUALS: Record<FileType, AssetTypeVisual> = {
    ocelFile: {
        icon: Database,
        color: 'text-blue-500',
    },
    ocptFile: {
        icon: FileText,
        color: 'text-green-500',
    },
};
