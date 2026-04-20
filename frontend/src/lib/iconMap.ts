import type { ComponentType } from 'react';
import {
    Activity,
    ChartBar,
    Database,
    File,
    FileJson,
    FileSpreadsheet,
    FileStack,
    FileText,
    Fingerprint,
    Grip,
    Layers,
    type LucideProps,
    Network,
    Pickaxe,
    Radar,
    ShieldCheck,
    TreePine,
    Waves,
    Workflow,
} from 'lucide-react';
import type { AssetType } from '~/types/files.types';

export const iconMap: Record<string, ComponentType<LucideProps>> = {
    database: Database,
    fileText: FileText,
    fingerprint: Fingerprint,
    workflow: Workflow,
    activity: Activity,
    fileSpreadsheet: FileSpreadsheet,
    fileJson: FileJson,
    treePine: TreePine,
    network: Network,
    grip: Grip,
    file: File,
    waves: Waves,
    pickaxe: Pickaxe,
    chartBar: ChartBar,
    fileStack: FileStack,
    layers: Layers,
    radar: Radar,
    shieldCheck: ShieldCheck,
};

export const getIconComponent = (iconName: string): ComponentType<LucideProps> => {
    return iconMap[iconName] || FileText; // Default to FileText if icon not found
};

interface AssetTypeVisual {
    icon: ComponentType<LucideProps>;
    color: string;
    label: string;
}

export const ASSET_TYPE_VISUALS: Record<AssetType, AssetTypeVisual> = {
    ocelFile: {
        icon: Database,
        color: 'text-blue-500',
        label: 'OCEL',
    },
    ocptFile: {
        icon: FileText,
        color: 'text-green-500',
        label: 'OCPT',
    },
    ocptAsset: {
        icon: FileText,
        color: 'text-green-500',
        label: 'OCPT',
    },
    ocelAsset: {
        icon: Database,
        color: 'text-blue-500',
        label: 'OCEL',
    },
    ocelCollectionFile: {
        icon: FileStack,
        color: 'text-green-500',
        label: 'OCEL Collection',
    },
    identityOcptAsset: {
        icon: FileText,
        color: 'text-amber-500',
        label: 'Identity OCPT',
    },
    abstractionAsset: {
        icon: Layers,
        color: 'text-purple-500',
        label: 'Abstraction',
    },
    conformanceAsset: {
        icon: Radar,
        color: 'text-blue-500',
        label: 'Conformance',
    },
};
