import React, { memo, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { NodeProps, Position } from '@xyflow/react';
import BaseMinerNode from '~/components/explore/miner/BaseMinerNode';
import { useInputAsset, useMinerOutput } from '~/hooks/explore/useMinerAssets';
import { useMineOcpn } from '~/services/queries';
import { MinerNode } from '~/types/explore/nodes';
const OcpnMinerNode = memo<NodeProps<MinerNode>>((node) => {
    const queryClient = useQueryClient();
    const { id, data: nodeData } = node;
    const { assets } = nodeData;

    const inputAsset = useInputAsset(assets, 'ocptAsset');
    const inputFileId = inputAsset?.id ?? null;
    const fileName = inputAsset?.name ?? 'OCPN_Model';

    const hasMinedAsset = useMemo(() => {
        return assets.some((asset) => asset.io === 'output' && asset.origin === 'mined');
    }, [assets]);

    const { isLoading, isFetching, data } = useMineOcpn(id, inputFileId, !hasMinedAsset);

    useMinerOutput(id, data?.file_id, fileName, 'ocpnAsset', 'ocpnFileNode');

    const handleReset = useCallback(() => {
        if (inputFileId) {
            queryClient.cancelQueries({ queryKey: ['mineOcpn', inputFileId] });
            queryClient.removeQueries({ queryKey: ['mineOcpn', inputFileId] });
        }
    }, [inputFileId, queryClient]);

    return (
        <BaseMinerNode
            {...node}
            title="OCPN Miner"
            iconName="waypoints"
            handleOptions={[
                { id: 'target', position: Position.Left, type: 'target' as const },
                { id: 'source', position: Position.Right, type: 'source' as const },
            ]}
            dropdownOptions={[{ label: 'Change Source', action: 'changeSourceFile' as const }]}
            isLoading={isLoading || isFetching}
            onReset={handleReset}
        />
    );
});

OcpnMinerNode.displayName = 'OcpnMinerNode';
export default OcpnMinerNode;
