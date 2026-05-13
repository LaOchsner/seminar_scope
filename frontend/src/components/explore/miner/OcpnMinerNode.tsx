import React, { memo, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BaseEdge, Edge, EdgeProps, Handle, Node, NodeProps, Position } from '@xyflow/react';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '~/components/ui/button';
import BaseMinerNode from '~/components/explore/miner/BaseMinerNode';
import { useInputAsset } from '~/hooks/explore/useMinerAssets';
import { MinerNode } from '~/types/explore/nodes';

// ==========================================
// OCPN MINER nodes definition
// ==========================================

export type MinerPlaceNode = Node<{
    label: string;
    objectType: string;
    color: string;
    size: number;
    labelSize: number;
    initial: boolean;
    final: boolean;
}>;

export type MinerTransitionNode = Node<{
    label: string;
    size: number;
    labelSize: number;
    silent: boolean;
}>;

export type MinerArcEdge = Edge<{
    color: string;
    curvature: number;
    variable: boolean;
}>;

export const PlaceNode = ({ data }: NodeProps<MinerPlaceNode>) => {
    const isSpecial = data.initial || data.final;

    return (
        <div className="flex flex-col items-center justify-center pointer-events-none">
            <div
                className="rounded-full bg-white transition-all duration-300 pointer-events-auto shadow-md hover:shadow-lg hover:scale-110 active:scale-95 flex items-center justify-center relative"
                style={{
                    width: data.size * 2,
                    height: data.size * 2,
                    borderColor: data.color,
                    borderWidth: isSpecial ? 5 : 2.5,
                }}
            >
                {isSpecial && (
                    <span className="text-[8px] font-black uppercase text-slate-400 select-none">
                        {data.initial ? 'in' : 'out'}
                    </span>
                )}
                <Handle
                    type="target"
                    position={Position.Top}
                    className="opacity-0 absolute inset-0 w-full h-full border-0 bg-transparent"
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="opacity-0 absolute inset-0 w-full h-full border-0 bg-transparent"
                />
            </div>
            <span
                className="mt-2 font-bold text-slate-500 whitespace-nowrap pointer-events-none select-none tracking-tight"
                style={{ fontSize: data.labelSize }}
            >
                {data.label}
            </span>
        </div>
    );
};

export const TransitionNode = ({ data }: NodeProps<MinerTransitionNode>) => {
    return (
        <div className="flex flex-col items-center justify-center pointer-events-none">
            <div
                className="rounded-md transition-all duration-300 pointer-events-auto shadow-md hover:shadow-lg hover:scale-105 active:scale-95 relative"
                style={{
                    width: data.size * 1.8,
                    height: data.size * 1.8,
                    backgroundColor: data.silent ? '#1e293b' : '#f8fafc',
                    borderWidth: 2,
                    borderColor: data.silent ? '#1e293b' : '#475569',
                }}
            >
                <Handle
                    type="target"
                    position={Position.Top}
                    className="opacity-0 absolute inset-0 w-full h-full border-0 bg-transparent"
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="opacity-0 absolute inset-0 w-full h-full border-0 bg-transparent"
                />
            </div>
            {!data.silent && (
                <span
                    className="mt-2 font-bold text-slate-500 whitespace-nowrap pointer-events-none select-none tracking-tight"
                    style={{ fontSize: data.labelSize }}
                >
                    {data.label}
                </span>
            )}
        </div>
    );
};

export const ArcEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style = {},
    markerEnd,
    data,
}: EdgeProps<MinerArcEdge>) => {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const curvature = data?.curvature ?? 1.2;
    const dr = curvature === 0 ? 0 : distance * (1 / curvature);

    const edgePath =
        dr === 0
            ? `M${sourceX},${sourceY} L${targetX},${targetY}`
            : `M${sourceX},${sourceY} A${dr},${dr} 0 0,1 ${targetX},${targetY}`;

    return (
        <BaseEdge
            id={id}
            path={edgePath}
            markerEnd={markerEnd}
            style={{
                ...style,
                stroke: data?.color,
                strokeWidth: data?.variable ? 4 : 1.5,
                strokeDasharray: data?.variable ? '4 4' : 'none',
                strokeOpacity: 0.8,
            }}
        />
    );
};

// ==========================================
// MAIN PIPELINE NODE for the default exports
// ==========================================

// const OcpnMinerNode = memo<NodeProps<MinerNode>>((node) => {
//     const navigate = useNavigate();
//     const queryClient = useQueryClient();
//     const { id, data: nodeData } = node;
//     const { assets } = nodeData;

//     const inputAsset = useInputAsset(assets, 'ocptFile');
//     const inputFileId = inputAsset?.id ?? null;

//     const hasMinedAsset = useMemo(() => {
//         return assets.some((asset) => asset.io === 'output' && asset.origin === 'mined');
//     }, [assets]);

//     const openMinerInterface = () => {
//         if (inputFileId) {
//             navigate(`/data/pipeline/explore/ocpn/${id}`);
//         }
//     };

//     const handleReset = useCallback(() => {
//         if (inputFileId) {
//             // Purely clear the queries related to this node/file
//             queryClient.cancelQueries({ queryKey: ['getOcpn', inputFileId] });
//             queryClient.removeQueries({ queryKey: ['getOcpn', inputFileId] });
//         }
//     }, [inputFileId, queryClient]);

//     const renderActions = () => {
//         if (!inputFileId) return null;
//         return (
//             <div className="flex items-center">
//                 <Button
//                     onClick={openMinerInterface}
//                     className="flex items-center h-6 px-2 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-md"
//                     aria-label="Configure OCPN miner"
//                 >
//                     <Eye className="h-3.5 w-3.5 mr-1 text-blue-600" />
//                     <span className="text-xs text-blue-600">{hasMinedAsset ? 'View/Edit' : 'Configure'}</span>
//                 </Button>
//             </div>
//         );
//     };

//     return (
//         <BaseMinerNode
//             {...node}
//             title="OCPN Miner"
//             iconName="waypoints"
//             handleOptions={[
//                 { id: 'target', position: Position.Left, type: 'target' as const },
//                 { id: 'source', position: Position.Right, type: 'source' as const },
//             ]}
//             dropdownOptions={[{ label: 'Change Source', action: 'changeSourceFile' as const }]}
//             customActions={renderActions()}
//             onReset={handleReset}
//         />
//     );
// });

// OcpnMinerNode.displayName = 'OcpnMinerNode';

// export default OcpnMinerNode;

const OcpnMinerNode = memo<NodeProps<MinerNode>>((node) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { id, data: nodeData } = node;
    const { assets } = nodeData;

    // Checks if an OCPT file is connected to the input handle
    const inputAsset = useInputAsset(assets, 'ocptFile');
    const inputFileId = inputAsset?.id ?? null;

    const openMinerInterface = () => {
        if (inputFileId) {
            // navigagting to the viewer page
            navigate(`/data/pipeline/explore/ocpn/${id}`);
        }
    };

    const handleReset = useCallback(() => {
        if (inputFileId) {
            queryClient.cancelQueries({ queryKey: ['getOcpn', inputFileId] });
            queryClient.removeQueries({ queryKey: ['getOcpn', inputFileId] });
        }
    }, [inputFileId, queryClient]);

    const renderActions = () => {
        // If no OCPT is connected, the button remains hidden!
        if (!inputFileId) return null;

        // When OCPT is connected, show the Visualization button
        return (
            <div className="flex items-center">
                <Button
                    onClick={openMinerInterface}
                    className="flex items-center h-6 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                    aria-label="Show OCPN Visualization"
                >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-xs font-bold">Show Visualization</span>
                </Button>
            </div>
        );
    };

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
            customActions={renderActions()}
            onReset={handleReset}
        />
    );
});

OcpnMinerNode.displayName = 'OcpnMinerNode';

export default OcpnMinerNode;
