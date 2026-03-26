import { memo, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import BaseMinerNode from '~/components/explore/miner/BaseMinerNode';
import { handleMinerOutput } from '~/lib/explore/flowActions';
import { useExtendOcptWithIdentity } from '~/services/queries';
import { MinerNode } from '~/types/explore/nodes';

const ExtendWithIdentityNode = memo<NodeProps<MinerNode>>((node) => {
    const queryClient = useQueryClient();
    const [ocptFileId, setOcptFileId] = useState<string | null>(null);
    const [ocelFileId, setOcelFileId] = useState<string | null>(null);
    const [inputFileName, setInputFileName] = useState<string>('');

    const hasMinedAsset = useMemo(() => {
        return node.data.assets.some((asset) => asset.io === 'output');
    }, [node.data.assets]);

    const ocelAsset = useMemo(
        () => node.data.assets.find((a) => a.io === 'input' && (a.type === 'ocelAsset' || a.type === 'ocelFile')),
        [node.data.assets]
    );

    useEffect(() => {
        const ocptAsset = node.data.assets.find(
            (a) => a.io === 'input' && (a.type === 'ocptAsset' || a.type === 'ocptFile')
        );

        setOcptFileId(ocptAsset?.id ?? null);
        setOcelFileId(ocelAsset?.id ?? null);
        setInputFileName(ocptAsset?.name ?? ocelAsset?.name ?? '');
    }, [node.data.assets, ocelAsset]);

    const { isLoading, isFetching, data } = useExtendOcptWithIdentity(
        node.id,
        ocptFileId,
        ocelFileId,
        !hasMinedAsset
    );

    useEffect(() => {
        if (!data?.file_id || !inputFileName) return;

        handleMinerOutput({
            nodeId: node.id,
            outputAssetId: data.file_id,
            outputAssetType: 'identityOcptAsset',
            outputNodeType: 'ocptFileNode',
            inputFileName,
        });
    }, [data?.file_id, inputFileName, node.id]);

    const handleReset = () => {
        setOcptFileId(null);
        setOcelFileId(null);
        setInputFileName('');
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
