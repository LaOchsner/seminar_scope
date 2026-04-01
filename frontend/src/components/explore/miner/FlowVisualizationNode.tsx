import { memo, useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '~/components/ui/button';
import BaseMinerNode from '~/components/explore/miner/BaseMinerNode';
import { useInputAsset } from '~/hooks/explore/useMinerAssets';
import { ASSET_TYPE_VISUALS } from '~/lib/iconMap';
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
            dropdownOptions={[]}
            isLoading={false}
            onReset={() => {}}
        >
            {/* Secondary OCEL input handle */}
            <div className="relative mt-2 border-t pt-2">
                <Handle id="ocelTarget" type="target" position={Position.Left} style={{ left: '-0.75rem' }} />
                <p className="text-xs font-semibold text-gray-500 mb-2">OCEL Input</p>
                {ocelAsset
                    ? (() => {
                          const { label, icon: Icon, color } = ASSET_TYPE_VISUALS[ocelAsset.type];
                          return (
                              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-50 border border-gray-200">
                                  <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                                  <span className="text-xs font-medium text-gray-700">{label}</span>
                              </div>
                          );
                      })()
                    : (() => {
                          const { label, icon: Icon, color } = ASSET_TYPE_VISUALS['ocelFile'];
                          return (
                              <div className="flex items-center gap-1.5">
                                  <Icon className={`h-3 w-3 ${color}`} />
                                  <span className="text-xs text-gray-600">{label}</span>
                              </div>
                          );
                      })()}
            </div>

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
