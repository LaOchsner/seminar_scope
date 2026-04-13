import { memo, useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import BaseMinerNode from '~/components/explore/miner/BaseMinerNode';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { useGetAbstraction } from '~/services/queries';
import { useInputAsset } from '~/hooks/explore/useMinerAssets';
import { AbstractionSourceKind } from '~/services/api';
import { MinerNode } from '~/types/explore/nodes';
import { AssetType } from '~/types/files.types';
import {
    BaseExploreNodeDropdownOption,
} from '~/types/explore/nodeData/baseNodeData';

const assetTypeToSourceKind = (type: AssetType): AbstractionSourceKind | null => {
    if (type === 'ocelFile' || type === 'ocelAsset') return 'ocel';
    if (type === 'ocptFile' || type === 'ocptAsset') return 'ocpt';
    if (type === 'identityOcptAsset') return 'extended_ocpt';
    return null;
};

const AbstractionMinerNode = memo<NodeProps<MinerNode>>((node) => {
    const queryClient = useQueryClient();
    const { updateNodeData } = useExploreFlowStore();

    const hasMinedAsset = useMemo(
        () => node.data.assets.some((asset) => asset.io === 'output'),
        [node.data.assets]
    );

    const inputAsset = useInputAsset(node.data.assets);
    const fileId = inputAsset?.id ?? null;
    const fileName = inputAsset?.name ?? '';
    const sourceKind = inputAsset ? assetTypeToSourceKind(inputAsset.type) : null;

    const { isLoading, isFetching, data } = useGetAbstraction(
        node.id,
        fileId,
        sourceKind,
        !hasMinedAsset
    );

    useEffect(() => {
        if (!data?.file_id || !fileName) return;
        updateNodeData(node.id, (prev) => {
            const alreadyPresent = prev.assets.some((a) => a.io === 'output' && a.id === data.file_id);
            if (alreadyPresent) return prev;
            return {
                assets: [
                    ...prev.assets.filter((a) => a.io !== 'output'),
                    { id: data.file_id, io: 'output' as const, origin: 'mined' as const, type: 'abstractionAsset' as const, name: fileName },
                ],
            };
        });
    }, [data?.file_id, fileName, node.id, updateNodeData]);

    const handleReset = useCallback(() => {
        queryClient.removeQueries({ queryKey: ['getAbstraction', node.id] });
    }, [queryClient, node.id]);

    const dropdownOptions: BaseExploreNodeDropdownOption[] = [
        { label: 'Change Source', action: 'changeSourceFile' as const },
    ];

    return (
        <BaseMinerNode
            {...node}
            title="Abstraction Miner"
            iconName="layers"
            handleOptions={[
                { id: 'target', position: Position.Left, type: 'target' as const },
                { id: 'source', position: Position.Right, type: 'source' as const },
            ]}
            dropdownOptions={dropdownOptions}
            isLoading={isLoading || isFetching}
            onReset={handleReset}
        />
    );
});

export default AbstractionMinerNode;
