import { useCallback, useEffect, useState, type MouseEvent } from 'react';
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
import OcpnTooltip, { OcpnHoverState } from '~/components/ocpn/OcpnTooltip';
import { getDeterministicColor } from '~/lib/colors';
import { OcpnId, RustOcpnData, RustOcpnPlace, RustOcpnTransition } from '~/types/ocpn.types';

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

type OcpnRenderableNode =
    | (RustOcpnPlace & { type: 'place'; displayLabel: string })
    | (RustOcpnTransition & { type: 'transition'; displayLabel: string });

const nodeTypes = { place: PlaceNode, transition: TransitionNode };
const edgeTypes = { arc: ArcEdge };
const TOP_VIEWPORT_PADDING = 48;

export const getArcId = (endpoint: unknown) =>
    typeof endpoint === 'object' && endpoint !== null && 'id' in endpoint ? (endpoint as { id: OcpnId }).id : endpoint;

export const toFlowId = (id: OcpnId | unknown) => String(id);

const property = (source: unknown, key: string): unknown => {
    if (!source || typeof source !== 'object') return undefined;
    return (source as Record<string, unknown>)[key];
};

const roleOf = (node: unknown): string => String(property(property(node, 'properties'), 'role') ?? '');

const transitionFunctionKind = (transitionFunction: unknown): string => {
    if (!transitionFunction) return '';
    if (typeof transitionFunction === 'string') return transitionFunction;
    if (typeof transitionFunction !== 'object') return String(transitionFunction);

    const kind = property(transitionFunction, 'kind');
    if (typeof kind === 'string') return kind;

    return Object.keys(transitionFunction)[0] ?? '';
};

const normalizedFunctionKind = (transitionFunction: unknown) =>
    transitionFunctionKind(transitionFunction)
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase();

const relationBatchSize = (transitionFunction: unknown): string | null => {
    if (!transitionFunction || typeof transitionFunction !== 'object') return null;
    const direct = property(transitionFunction, 'batch_size');
    if (direct !== undefined && direct !== null) return String(direct);
    const relation = property(transitionFunction, 'relation');
    const kind = property(relation, 'kind');
    if (!kind || typeof kind !== 'object') return null;
    const batch = property(kind, 'ImpBatch');
    return batch === undefined || batch === null ? null : String(batch);
};

const friendlyPlaceLabel = (place: RustOcpnPlace) => {
    const role = roleOf(place);
    if (
        role === 'strict_sync' ||
        role === 'subset_sync' ||
        role === 'implication' ||
        role === 'batch_overflow' ||
        role === 'object_split' ||
        role === 'object_merge'
    ) {
        return place.name;
    }
    if (place.object_types?.length) return place.object_types.join(' + ');
    return place.name;
};

const friendlyTransitionLabel = (transition: RustOcpnTransition, transitionFunction?: unknown) => {
    if (!transition.silent) return transition.label || transition.name;

    const role = roleOf(transition);
    const name = transition.name;
    const kind = normalizedFunctionKind(transitionFunction);
    const batch = relationBatchSize(transitionFunction);

    if (kind === 'strict_sync_init') return 'tau_sync_init';
    if (kind === 'strict_sync_resolve') return 'tau_sync_resolve';
    if (kind === 'subset_select') return 'tau_subset_select';
    if (kind === 'subset_resolve') return 'tau_subset_resolve';
    if (kind === 'subset_overlap_loop') return 'tau_subset_overlap_loop';
    if (kind === 'implication_init') return batch ? `tau_imp_init_k${batch}` : 'tau_imp_init';
    if (kind === 'implication_resolve') return batch ? `tau_imp_resolve_k${batch}` : 'tau_imp_resolve';
    if (kind === 'batch_overflow') return batch ? `tau_batch_overflow_k${batch}` : 'tau_batch_overflow';
    if (kind === 'object_split') return 'tau_object_split';
    if (kind === 'object_merge') return 'tau_object_merge';

    if (role.includes('strict_to_subset') || name.includes('strict_to_subset')) return 'tau_strict_to_subset';
    if (role.includes('strict_sync_enter_child') || name.includes('strict_sync_enter_child')) {
        return 'tau_strict_enter_child';
    }
    if (role.includes('subset_sync_enter_child') || name.includes('subset_sync_enter_child')) {
        return 'tau_subset_enter_child';
    }
    if (role.includes('implication_enter_child') || name.includes('implication_enter_child')) {
        return 'tau_imp_enter_child';
    }
    if (role === 'sequence_link' || name.includes('sequence_link')) return 'tau_sequence_link';

    return name || 'tau';
};

const estimateNodeSize = (
    node: { id: OcpnId; type: string; name?: string; label?: string | null; silent?: boolean; displayLabel?: string },
    params: OcpnVizParams
) => {
    if (node.type === 'place') {
        const labelWidth = (node.displayLabel || node.name || '').length * params.labelSize * 0.62;
        const circleSize = params.nodeSize * 2;
        return {
            width: Math.max(circleSize, labelWidth),
            height: circleSize + params.labelSize + 4,
        };
    }

    if (node.silent) {
        const size = params.nodeSize * 1.4;
        const labelWidth = (node.displayLabel || '').length * Math.max(8, params.labelSize - 2) * 0.62;
        return { width: Math.max(size, labelWidth), height: size + params.labelSize + 4 };
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
    const [hover, setHover] = useState<OcpnHoverState | null>(null);

    const getColor = useCallback((type: string) => colorMap[type] || getDeterministicColor(type), [colorMap]);

    const updateHoverPosition = useCallback((event: MouseEvent, item: Node) => {
        setHover({
            item,
            x: event.clientX,
            y: event.clientY,
        });
    }, []);

    useEffect(() => {
        onFitReady?.(() => fitView({ padding: 0.45 }));
    }, [fitView, onFitReady]);

    const runDagreLayout = useCallback(
        (currentData: RustOcpnData, currentParams: OcpnVizParams) => {
            const nodesList: OcpnRenderableNode[] = [
                ...currentData.places.map((p) => ({ ...p, type: 'place' as const, displayLabel: friendlyPlaceLabel(p) })),
                ...(currentData.transitions || []).map((t) => ({
                    ...t,
                    type: 'transition' as const,
                    displayLabel: friendlyTransitionLabel(t, currentData.transition_functions?.[toFlowId(t.id)]),
                })),
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

            const flowNodes: Node[] = nodesList.map((n) => {
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
                        label: n.displayLabel,
                        rawLabel: n.name || (n as RustOcpnTransition).label || '',
                        objectType: (n as RustOcpnPlace).object_type,
                        objectTypes: (n as RustOcpnPlace).object_types,
                        color: (n as RustOcpnPlace).object_type
                            ? getColor((n as RustOcpnPlace).object_type)
                            : '#64748b',
                        size: currentParams.nodeSize,
                        labelSize: currentParams.labelSize,
                        initial: (n as RustOcpnPlace).initial,
                        final: (n as RustOcpnPlace).final,
                        silent: (n as RustOcpnTransition).silent,
                        raw: n,
                        transitionFunction:
                            n.type === 'transition' ? currentData.transition_functions?.[toFlowId(n.id)] : undefined,
                    },
                };
            });

            const flowEdges: Edge[] = validArcs.map((arc) => {
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
                        raw: arc,
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
            onNodeMouseEnter={(event, node) => updateHoverPosition(event, node)}
            onNodeMouseMove={(event, node) => updateHoverPosition(event, node)}
            onNodeMouseLeave={() => setHover(null)}
            fitView
            fitViewOptions={{ padding: 0.45 }}
        >
            <Background gap={20} color="#f1f5f9" />
            <OcpnTooltip hover={hover} />
        </ReactFlow>
    );
};

export default OcpnRendering;
