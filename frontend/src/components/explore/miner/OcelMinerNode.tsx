import { memo, useEffect, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import BaseMinerNode from '~/components/explore/miner/BaseMinerNode';
import { useGetOcel } from '~/services/queries';
import { BaseExploreNodeAsset } from '~/types/explore/nodeData/baseNodeData';
import { MinerNode } from '~/types/explore/nodes';
import { useExploreFlowStore } from '~/stores/exploreStore';

const OcelMinerNode = memo<NodeProps<MinerNode>>((node) => {
    const { updateNodeData } = useExploreFlowStore();
    const [fileId, setFileId] = useState<null | string>(null);
    const [fileName, setFileName] = useState<string>('');
    const { isLoading, data } = useGetOcel(fileId);

    // Pick the input file
    useEffect(() => {
        const inputAsset = node.data.assets.find((asset) => asset.io === 'input');
        if (!inputAsset) return;

        setFileId(inputAsset.id);
        setFileName(inputAsset.name);
    }, [node.data.assets]);

    // Once mined OCEL data is returned, create output asset
    useEffect(() => {
        if (!data || !fileName) return;

        const asset: BaseExploreNodeAsset = {
            id: data.file_id, // assuming backend returns file_id
            io: 'output',
            origin: 'mined',
            type: 'ocelAsset',
            name: `ocel_${fileName}`,
        };

        updateNodeData(node.id, (prev) => {
            const currentAssets = prev.assets.filter((a) => a.io !== 'output');
            return {
                assets: [...currentAssets, asset],
            };
        });
    }, [data, fileName, node.id, updateNodeData]);

    return (
        <BaseMinerNode
            {...node}
            title="OCEL Miner"
            iconName="fileText"
            handleOptions={[
                { position: Position.Left, type: 'target' as const },
                { position: Position.Right, type: 'source' as const },
            ]}
            dropdownOptions={[{ label: 'Change Source', action: 'changeSourceFile' as const }]}
            isLoading={isLoading}
        />
    );
});

export default OcelMinerNode;
