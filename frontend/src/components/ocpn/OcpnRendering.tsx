import { useCallback, useEffect } from 'react';
import dagre from '@dagrejs/dagre';
import {
    Background,
    Edge,
    MarkerType,
    Node,
    Position,
    ReactFlow,
    useEdgesState,
    useNodesState,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArcEdge, PlaceNode, TransitionNode } from '~/components/ocpn/OcpnElements';
import { getDeterministicColor } from '~/lib/colors';
import { OcpnId, RustOcpnData } from '~/types/ocpn.types';

export interface OcpnVizParams {
    hSpacing: number;
    vSpacing: number;
    nodeSize: number;
    labelSize: number;
}

interface OcpnRenderingProps {
    data: RustOcpnData;
    params: OcpnVizParams;
    colorMap: Record<string, string>;
    onFitReady?: (fit: () => void) => void;
}

const nodeTypes = { place: PlaceNode, transition: TransitionNode };
const edgeTypes = { arc: ArcEdge };
const TOP_VIEWPORT_PADDING = 48;

export const getArcId = (endpoint: unknown) =>
    typeof endpoint === 'object' && endpoint !== null && 'id' in endpoint ? (endpoint as { id: OcpnId }).id : endpoint;

export const toFlowId = (id: OcpnId | unknown) => String(id);

const estimateNodeSize = (
    node: { id: OcpnId; type: string; name?: string; label?: string | null; silent?: boolean },
    params: OcpnVizParams
) => {
    if (node.type === 'place') {
        const labelWidth = (node.name || '').length * params.labelSize * 0.62;
        const circleSize = params.nodeSize * 2;
        return {
            width: Math.max(circleSize, labelWidth),
            height: circleSize + params.labelSize + 4,
        };
    }

    if (node.silent) {
        const size = params.nodeSize * 1.4;
        return { width: size, height: size };
    }

    const label = node.label || node.name || '';
    return {
        width: Math.max(params.nodeSize * 3.8, label.length * params.labelSize * 0.65 + 12),
        height: params.nodeSize * 2,
    };
};

const OcpnRendering: React.FC<OcpnRenderingProps> = ({ data, params, colorMap, onFitReady }) => {
    const { fitView, getViewport, setViewport } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const getColor = useCallback((type: string) => colorMap[type] || getDeterministicColor(type), [colorMap]);

    useEffect(() => {
        onFitReady?.(() => fitView({ padding: 0.45 }));
    }, [fitView, onFitReady]);

    const runDagreLayout = useCallback(
        (currentData: RustOcpnData, currentParams: OcpnVizParams) => {
            const nodesList = [
                ...currentData.places.map((p) => ({ ...p, type: 'place' })),
                ...(currentData.transitions || []).map((t) => ({ ...t, type: 'transition' })),
            ];

            const validNodeIds = new Set(nodesList.map((n) => toFlowId(n.id)));
            const validArcs = (currentData.arcs || []).filter((arc) => {
                const sourceId = toFlowId(getArcId(arc.source));
                const targetId = toFlowId(getArcId(arc.target));
                return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
            });

            const graph = new dagre.graphlib.Graph();
            graph.setDefaultEdgeLabel(() => ({}));
            graph.setGraph({
                rankdir: 'LR',
                acyclicer: 'greedy',
                ranker: 'network-simplex',
                ranksep: currentParams.hSpacing,
                nodesep: currentParams.vSpacing,
                edgesep: Math.max(8, currentParams.vSpacing / 4),
                marginx: 24,
                marginy: 24,
            });

            const nodeSizes = new Map<string, { width: number; height: number }>();
            nodesList.forEach((node) => {
                const id = toFlowId(node.id);
                const size = estimateNodeSize(node, currentParams);
                nodeSizes.set(id, size);
                graph.setNode(id, size);
            });

            validArcs.forEach((arc) => {
                graph.setEdge(toFlowId(getArcId(arc.source)), toFlowId(getArcId(arc.target)), {
                    weight: arc.variable ? 2 : 1,
                });
            });

            dagre.layout(graph);

            const flowNodes = nodesList.map((n) => {
                const id = toFlowId(n.id);
                const layoutNode = graph.node(id);
                const size = nodeSizes.get(id) ?? estimateNodeSize(n, currentParams);

                return {
                    id,
                    type: n.type,
                    sourcePosition: Position.Right,
                    targetPosition: Position.Left,
                    position: {
                        x: layoutNode.x - size.width / 2,
                        y: layoutNode.y - size.height / 2,
                    },
                    data: {
                        label: n.name || (n as any).label || '',
                        objectType: (n as any).object_type,
                        color: (n as any).object_type ? getColor((n as any).object_type) : '#64748b',
                        size: currentParams.nodeSize,
                        labelSize: currentParams.labelSize,
                        initial: (n as any).initial,
                        final: (n as any).final,
                        silent: (n as any).silent,
                    },
                };
            });

            const flowEdges = validArcs.map((arc) => {
                const src = toFlowId(getArcId(arc.source));
                const tgt = toFlowId(getArcId(arc.target));
                const connectedPlace = currentData.places.find((p) => toFlowId(p.id) === src || toFlowId(p.id) === tgt);
                const objType = connectedPlace ? connectedPlace.object_type : 'default';
                const color = objType !== 'default' ? getColor(objType) : '#94a3b8';

                return {
                    id: toFlowId(arc.id),
                    source: src,
                    target: tgt,
                    type: 'arc',
                    data: {
                        color,
                        curvature: 0,
                        variable: arc.variable,
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color,
                    },
                };
            });

            return { flowNodes, flowEdges };
        },
        [getColor]
    );

    useEffect(() => {
        if (!data?.places) return;

        const { flowNodes, flowEdges } = runDagreLayout(data, params);
        setNodes(flowNodes);
        setEdges(flowEdges);
        window.requestAnimationFrame(async () => {
            await fitView({ padding: 0.45, duration: 200 });

            const topY = Math.min(...flowNodes.map((node) => node.position.y));
            const viewport = getViewport();
            setViewport(
                {
                    ...viewport,
                    y: TOP_VIEWPORT_PADDING - topY * viewport.zoom,
                },
                { duration: 120 }
            );
        });
    }, [params, data, setNodes, setEdges, runDagreLayout, fitView, getViewport, setViewport]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.45 }}
        >
            <Background gap={20} color="#f1f5f9" />
        </ReactFlow>
    );
};

export default OcpnRendering;
