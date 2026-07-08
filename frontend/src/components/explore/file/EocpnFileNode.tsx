import { memo, useEffect, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import BaseFileNode from '~/components/explore/file/BaseFileNode';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { useGetEocpn } from '~/services/queries';
import { generateColorMap } from '~/lib/colors';
import { propagateMapDownstream, syncMatchingColorsGlobally } from '~/lib/explore/flowActions';
import { FileNode } from '~/types/explore/nodes';

const EocpnFileNode = memo<NodeProps<FileNode>>((props) => {
    const { id, data: nodeData } = props;
    const { assets } = nodeData;
    const updateNodeData = useExploreFlowStore((s) => s.updateNodeData);

    const eocpnAsset = useMemo(
        () => assets.find((asset) => asset.io === 'output' && asset.type === 'eocpnAsset'),
        [assets]
    );
    const fileId = eocpnAsset?.id ?? null;
    const hasFile = Boolean(eocpnAsset);

    const { data } = useGetEocpn(fileId, hasFile);

    useEffect(() => {
        if (data?.eocpn) {
            updateNodeData(id, { processedData: data.eocpn });
        }
    }, [data, id, updateNodeData]);

    useEffect(() => {
        const objectTypes: string[] = Array.from(
            new Set<string>(
                (data?.eocpn?.places ?? [])
                    .flatMap((place: any) => place.object_types ?? [])
                    .filter((objectType: unknown): objectType is string => typeof objectType === 'string')
            )
        );
        if (objectTypes && objectTypes.length > 0) {
            const currentColorMap = nodeData.colorMap;
            const hasValidColorMap =
                currentColorMap && typeof currentColorMap === 'object' && Object.keys(currentColorMap).length > 0;

            if (!hasValidColorMap) {
                const newColorMap = generateColorMap(objectTypes);
                updateNodeData(id, { colorMap: newColorMap });
                setTimeout(() => {
                    syncMatchingColorsGlobally(id);
                    propagateMapDownstream(id, newColorMap);
                }, 10);
            }
        }
    }, [data, id, updateNodeData, nodeData.colorMap]);

    return (
        <BaseFileNode
            {...props}
            title="EOCPN File"
            iconName="chartNetwork"
            handleOptions={[
                { id: 'source', position: Position.Right, type: 'source' as const },
                { id: 'target', position: Position.Left, type: 'target' as const },
            ]}
            dropdownOptions={[{ label: 'Set Custom Color', action: 'setCustomColor' as const, icon: 'palette' }]}
        />
    );
});

EocpnFileNode.displayName = 'EocpnFileNode';
export default EocpnFileNode;
