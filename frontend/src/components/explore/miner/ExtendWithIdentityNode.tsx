import { memo, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import BaseMinerNode from '~/components/explore/miner/BaseMinerNode';
import { useInputAsset, useMinerOutput } from '~/hooks/explore/useMinerAssets';
import { useExtendOcptWithIdentity } from '~/services/queries';
import { MinerNode } from '~/types/explore/nodes';

const ExtendWithIdentityNode = memo<NodeProps<MinerNode>>((node) => {
    const queryClient = useQueryClient();

    const hasMinedAsset = useMemo(() => {
        return node.data.assets.some((asset) => asset.io === 'output');
    }, [node.data.assets]);

    const ocptAsset = useInputAsset(node.data.assets, 'ocptAsset', 'ocptFile');
    const ocelAsset = useInputAsset(node.data.assets, 'ocelAsset', 'ocelFile');
    const inputFileName = ocptAsset?.name ?? ocelAsset?.name ?? '';

    const { isLoading, isFetching, data } = useExtendOcptWithIdentity(
        node.id,
        ocptAsset?.id ?? null,
        ocelAsset?.id ?? null,
        !hasMinedAsset
    );

    useMinerOutput(node.id, data?.file_id, inputFileName, 'identityOcptAsset', 'ocptFileNode');

    const handleReset = () => {
        queryClient.removeQueries({ queryKey: ['extendOcptWithIdentity', node.id] });
    };

    return (
        <BaseMinerNode
            {...node}
            title="Extend with Identity"
            iconName="fingerprint"
            handleOptions={[
                { id: 'ocptTarget', position: Position.Left, type: 'target' as const },
                { id: 'source', position: Position.Right, type: 'source' as const },
            ]}
            dropdownOptions={[]}
            isLoading={isLoading || isFetching}
            onReset={handleReset}
        >
            <div className="relative mt-2 border-t pt-2">
                <Handle
                    id="ocelTarget"
                    type="target"
                    position={Position.Left}
                    style={{ left: '-0.75rem' }}
                />
                {ocelAsset ? (
                    <p className="text-xs text-gray-600">{'📄'}{ocelAsset.name}</p>
                ) : (
                    <p className="text-xs text-muted-foreground italic">Connect OCEL file</p>
                )}
            </div>
        </BaseMinerNode>
    );
});

export default ExtendWithIdentityNode;
