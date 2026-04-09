import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import BaseMinerNode from '~/components/explore/miner/BaseMinerNode';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { useMineOcpt } from '~/services/queries';
import { useInputAsset, useMinerOutput } from '~/hooks/explore/useMinerAssets';
import {
    BaseExploreNodeDropdownActionType,
    BaseExploreNodeDropdownOption,
} from '~/types/explore/nodeData/baseNodeData';
import { MinerNode } from '~/types/explore/nodes';

const OcptMinerNode = memo<NodeProps<MinerNode>>((node) => {
    const queryClient = useQueryClient();
    const { updateNodeData } = useExploreFlowStore();
    const [algorithm, setAlgorithm] = useState<string>(node.data.algorithm ?? 'DF2');

    const hasMinedAsset = useMemo(() => {
        return node.data.assets.some((asset) => asset.io === 'output');
    }, [node.data.assets]);

    const inputAsset = useInputAsset(node.data.assets);
    const fileId = inputAsset?.id ?? null;
    const fileName = inputAsset?.name ?? '';

    const { isLoading, isFetching, data } = useMineOcpt(node.id, fileId, algorithm, !hasMinedAsset);

    useMinerOutput(node.id, data?.file_id, fileName, 'ocptAsset', 'ocptFileNode');

    useEffect(() => {
        if (algorithm === node.data.algorithm) return;

        updateNodeData(node.id, (prev) => {
            const newAssets = prev.assets.filter((asset) => asset.io !== 'output');
            return {
                assets: newAssets,
                algorithm: algorithm,
            };
        });
    }, [algorithm, node.data.algorithm, node.id, updateNodeData]);

    const handleExportJson = () => {
        if (!data) {
            console.warn('OCPT data not available for export.');
            return;
        }

        const jsonContent = JSON.stringify(data.ocpt, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ocpt_${fileName || 'export'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDropdownAction = (action: BaseExploreNodeDropdownActionType) => {
        if (action === 'exportJson') {
            handleExportJson();
        }
    };

    const dropdownOptions: BaseExploreNodeDropdownOption[] = [
        { label: 'Change Source', action: 'changeSourceFile' as const },
    ];

    if (hasMinedAsset && data) {
        dropdownOptions.push({ label: 'Export JSON', action: 'exportJson' as const });
    }

    const renderSettings = () => (
        <div className="flex items-center gap-2">
            <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger
                    className="h-6 px-2 bg-gray-100 text-amber-600 hover:bg-gray-200 rounded-md w-auto gap-1 text-xs font-semibold"
                    aria-label="Select mining algorithm"
                >
                    <SelectValue placeholder="Algorithm" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem className="text-xs text-amber-600 font-semibold" value="DF2">
                        DF2
                    </SelectItem>
                    <SelectItem className="text-xs text-amber-600 font-semibold" value="OCIM">
                        OCIM
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );

    const handleReset = useCallback(() => {
        queryClient.removeQueries({ queryKey: ['mineOcpt', node.id] });
    }, [queryClient, node.id]);

    return (
        <BaseMinerNode
            {...node}
            title="OCPT Miner"
            iconName="treePine"
            handleOptions={[
                { id: 'target', position: Position.Left, type: 'target' as const },
                { id: 'source', position: Position.Right, type: 'source' as const },
            ]}
            dropdownOptions={dropdownOptions}
            onDropdownAction={handleDropdownAction}
            isLoading={isLoading || isFetching}
            customActions={renderSettings()}
            onReset={handleReset}
        />
    );
});

export default OcptMinerNode;
