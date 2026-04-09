import { ASSET_TYPE_VISUALS } from '~/lib/iconMap';
import { AssetType } from '~/types/files.types';

interface AssetTypeListProps {
    types: readonly AssetType[];
}

/**
 * Renders a deduplicated list of asset type visuals (icon + label).
 * Deduplication is by label, so e.g. 'ocptFile' and 'ocptAsset' render as a single "OCPT" entry.
 */
const AssetTypeList = ({ types }: AssetTypeListProps) => {
    const uniqueVisuals = [...new Map(types.map((t) => [ASSET_TYPE_VISUALS[t].label, ASSET_TYPE_VISUALS[t]])).values()];

    return (
        <>
            {uniqueVisuals.map(({ label, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-dashed border-gray-300">
                    <Icon className={`h-3 w-3 ${color}`} />
                    <span className="text-xs text-gray-500">{label}</span>
                </div>
            ))}
        </>
    );
};

export default AssetTypeList;
