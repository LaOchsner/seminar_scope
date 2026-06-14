import { memo, useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '~/components/ui/button';
import BaseMinerNode from '~/components/explore/miner/BaseMinerNode';
import { useInputAsset } from '~/hooks/explore/useMinerAssets';
import { MinerNode } from '~/types/explore/nodes';

const FlowVisualizationNode = memo<NodeProps<MinerNode>>((node) => {
    const navigate = useNavigate();

    const ocptAsset = useInputAsset(node.data.assets, 'ocptAsset', 'ocptFile', 'identityOcptAsset');
    const ocelAsset = useInputAsset(node.data.assets, 'ocelAsset', 'ocelFile');

    const handleView = useCallback(() => {
        navigate(`/data/pipeline/explore/flow/${node.id}`);
    }, [navigate, node.id]);

    return (
        <BaseMinerNode
            {...node}
            title="Flow Visualization"
            iconName="zap"
            handleOptions={[
                { id: 'ocptTarget', position: Position.Left, type: 'target' as const },
            ]}
            secondaryHandles={[
                { id: 'ocelTarget', label: 'OCEL Input', hintTypes: ['ocelAsset', 'ocelFile'] },
            ]}
            dropdownOptions={[]}
            isLoading={false}
            onReset={() => {}}
        >
            {/* View button — only shown when both inputs are connected */}
            {ocptAsset && ocelAsset && (
                <div className="mt-2 border-t pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start h-7 px-2 text-xs"
                        onClick={handleView}
                    >
                        <Zap className="mr-2 h-3.5 w-3.5 text-yellow-500" />
                        View Animated Flow
                    </Button>
                </div>
            )}
        </BaseMinerNode>
    );
});

export default FlowVisualizationNode;
