import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Background,
    Edge,
    MarkerType,
    Node,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, Simulation } from 'd3';
import { Activity, ChevronDown, ChevronRight, Database, Maximize2, Settings } from 'lucide-react';
// Miner Nodes & Types
import { ArcEdge, PlaceNode, TransitionNode } from '../components/explore/miner/OcpnMinerNode.tsx';
// UI Components (Using relative paths instead of @/)
import { Button, buttonVariants } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { RustOcpnData } from '../types/ocpn.types';
// HARDCODED IMPORT: Adjust path as needed
import hardcodedOcpnData from '/Users/ekanshagarwal/Desktop/Hiwi_proj/scope/example_data/rust_ocpn.json';

// Types & Config
export interface VizParams {
    linkDistance: number;
    chargeStrength: number;
    collisionRadius: number;
    nodeSize: number;
    labelSize: number;
    arcCurvature: number;
}

const nodeTypes = { place: PlaceNode, transition: TransitionNode };
const edgeTypes = { arc: ArcEdge };
const modernColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

// get http// //v1/ocpn/from_ocpt/{ocpt_id}
// ==========================================
// 1. CORE HEADLESS VIEWER
// ==========================================
const ViewerCore = ({ data, params }: { data: RustOcpnData; params: VizParams }) => {
    const { fitView } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const simulationRef = useRef<Simulation<any, undefined> | null>(null);
    const physicsNodesRef = useRef<any[]>([]);
    const physicsLinksRef = useRef<any[]>([]);
    const paramsRef = useRef(params);

    useEffect(() => {
        paramsRef.current = params;
    }, [params]);

    const objectTypes = useMemo(() => Array.from(new Set(data.places.map((p) => p.object_type))), [data]);
    const getColor = useCallback(
        (type: string) => {
            const idx = objectTypes.indexOf(type);
            return modernColors[Math.max(0, idx) % modernColors.length];
        },
        [objectTypes]
    );

    // Initial Physics Setup
    useEffect(() => {
        if (!data || !data.places) return;

        physicsNodesRef.current = [
            ...data.places.map((p) => ({ ...p, type: 'place', x: Math.random() * 800, y: Math.random() * 600 })),
            ...data.transitions.map((t) => ({
                ...t,
                type: 'transition',
                x: Math.random() * 800,
                y: Math.random() * 600,
            })),
        ];

        physicsLinksRef.current = data.arcs.map((arc) => {
            const connectedPlace = data.places.find((p) => p.id === arc.source.id || p.id === arc.target.id);
            return {
                id: arc.id,
                source: arc.source.id,
                target: arc.target.id,
                variable: arc.variable,
                objectType: connectedPlace ? connectedPlace.object_type : 'default',
            };
        });

        if (simulationRef.current) simulationRef.current.stop();

        const sim = forceSimulation(physicsNodesRef.current)
            .force(
                'link',
                forceLink(physicsLinksRef.current)
                    .id((d: any) => d.id)
                    .distance(paramsRef.current.linkDistance)
            )
            .force('charge', forceManyBody().strength(paramsRef.current.chargeStrength))
            .force('center', forceCenter(400, 300))
            .force('collision', forceCollide().radius(paramsRef.current.collisionRadius));

        sim.on('tick', () => {
            const flowNodes = physicsNodesRef.current.map((n: any) => ({
                id: n.id,
                type: n.type,
                position: { x: n.x - paramsRef.current.nodeSize, y: n.y - paramsRef.current.nodeSize },
                data: {
                    label: n.name || n.label || '',
                    objectType: n.object_type,
                    color: n.object_type ? getColor(n.object_type) : '#64748b',
                    size: paramsRef.current.nodeSize,
                    labelSize: paramsRef.current.labelSize,
                    initial: n.initial,
                    final: n.final,
                    silent: n.silent,
                },
            }));

            const flowEdges = physicsLinksRef.current.map((l: any) => ({
                id: l.id,
                source: l.source.id || l.source,
                target: l.target.id || l.target,
                type: 'arc',
                data: {
                    color: l.objectType !== 'default' ? getColor(l.objectType) : '#94a3b8',
                    curvature: paramsRef.current.arcCurvature,
                    variable: l.variable,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: l.objectType !== 'default' ? getColor(l.objectType) : '#94a3b8',
                },
            }));

            setNodes(flowNodes);
            setEdges(flowEdges);
        });

        simulationRef.current = sim;
        setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 500);

        return () => sim.stop();
    }, [data, getColor, setNodes, setEdges, fitView]);

    // Dynamic Parameter Updates (Sliders)
    useEffect(() => {
        if (!simulationRef.current) return;
        const sim = simulationRef.current;

        (sim.force('link') as any).distance(params.linkDistance);
        (sim.force('charge') as any).strength(params.chargeStrength);
        (sim.force('collision') as any).radius(params.collisionRadius);

        sim.alpha(0.3).restart();
    }, [params.linkDistance, params.chargeStrength, params.collisionRadius]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitViewOptions={{ padding: 0.2 }}
        >
            <Background gap={20} color="#f1f5f9" />
        </ReactFlow>
    );
};

// ==========================================
// 2. MAIN LAYOUT (SIDEBAR + CANVAS)
// ==========================================
export default function OcpnViewer({ nodeId }: { nodeId?: string }) {
    const rawData = hardcodedOcpnData as unknown as RustOcpnData;

    // UI State
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['objects', 'styling']));
    const [vizParams, setVizParams] = useState<VizParams>({
        linkDistance: 120,
        chargeStrength: -400,
        collisionRadius: 45,
        nodeSize: 18,
        labelSize: 11,
        arcCurvature: 1.2,
    });

    // Object Types State
    const allObjectTypes = useMemo(
        () => Array.from(new Set(rawData?.places?.map((p) => p.object_type) || [])),
        [rawData]
    );
    const [visibleObjectTypes, setVisibleObjectTypes] = useState<Set<string>>(new Set(allObjectTypes));

    // Ensure state initializes if data loads slightly late
    useEffect(() => {
        if (allObjectTypes.length > 0 && visibleObjectTypes.size === 0) {
            setVisibleObjectTypes(new Set(allObjectTypes));
        }
    }, [allObjectTypes]);

    // Filter data based on toggles
    const filteredData = useMemo(() => {
        if (!rawData || !rawData.places) return null;

        const places = rawData.places.filter((p) => visibleObjectTypes.has(p.object_type));
        const placeIds = new Set(places.map((p) => p.id));

        // Keep arcs that connect to at least one visible place
        const arcs = rawData.arcs.filter((a) => placeIds.has(a.source.id) || placeIds.has(a.target.id));

        // Keep transitions connected to remaining arcs
        const connectedNodeIds = new Set();
        arcs.forEach((a) => {
            connectedNodeIds.add(a.source.id);
            connectedNodeIds.add(a.target.id);
        });
        const transitions = rawData.transitions.filter((t) => connectedNodeIds.has(t.id));

        return { ...rawData, places, arcs, transitions };
    }, [rawData, visibleObjectTypes]);

    const toggleSection = (id: string) => {
        const next = new Set(expandedSections);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedSections(next);
    };

    const toggleObjectType = (type: string) => {
        const next = new Set(visibleObjectTypes);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        setVisibleObjectTypes(next);
    };

    if (!filteredData) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-500 font-medium">
                Loading Data...
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="flex absolute inset-0 w-full h-full bg-white text-slate-900 font-sans overflow-hidden">
                {/* SIDEBAR */}
                <aside className="w-72 border-r border-slate-200 flex flex-col bg-white z-10 shadow-sm shrink-0">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" />
                            <h1 className="text-lg font-bold tracking-tight text-slate-800">OCPN Visualizer</h1>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-4 space-y-1">
                            {/* Object Perspectives */}
                            <div className="space-y-1">
                                <button
                                    onClick={() => toggleSection('objects')}
                                    className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md transition-colors group"
                                >
                                    <div className="flex items-center gap-2">
                                        <Database className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                            Object Perspectives
                                        </span>
                                    </div>
                                    {expandedSections.has('objects') ? (
                                        <ChevronDown className="w-3 h-3 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="w-3 h-3 text-slate-400" />
                                    )}
                                </button>

                                {expandedSections.has('objects') && (
                                    <div className="overflow-hidden pl-4 space-y-1 mt-1">
                                        {allObjectTypes.map((type) => (
                                            <div
                                                key={type}
                                                className="flex items-center justify-between p-2 hover:bg-slate-50/50 rounded-md"
                                            >
                                                <Label
                                                    htmlFor={`toggle-${type}`}
                                                    className="text-xs text-slate-600 capitalize cursor-pointer flex-1"
                                                >
                                                    {type}
                                                </Label>
                                                <Switch
                                                    id={`toggle-${type}`}
                                                    checked={visibleObjectTypes.has(type)}
                                                    onCheckedChange={() => toggleObjectType(type)}
                                                    className="scale-75"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Separator className="my-2 bg-slate-100" />

                            {/* Styling Configurations */}
                            <div className="space-y-1">
                                <button
                                    onClick={() => toggleSection('styling')}
                                    className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md transition-colors group"
                                >
                                    <div className="flex items-center gap-2">
                                        <Settings className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                            Styling
                                        </span>
                                    </div>
                                    {expandedSections.has('styling') ? (
                                        <ChevronDown className="w-3 h-3 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="w-3 h-3 text-slate-400" />
                                    )}
                                </button>

                                {expandedSections.has('styling') && (
                                    <div className="overflow-hidden pl-4 pr-2 py-3 space-y-5">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                                <Label>Link Distance</Label>
                                                <span>{vizParams.linkDistance}</span>
                                            </div>
                                            <Slider
                                                value={[vizParams.linkDistance]}
                                                min={50}
                                                max={300}
                                                step={10}
                                                onValueChange={(v) =>
                                                    setVizParams((p) => ({ ...p, linkDistance: v[0] }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                                <Label>Repulsion</Label>
                                                <span>{Math.abs(vizParams.chargeStrength)}</span>
                                            </div>
                                            <Slider
                                                value={[Math.abs(vizParams.chargeStrength)]}
                                                min={100}
                                                max={1000}
                                                step={50}
                                                onValueChange={(v) =>
                                                    setVizParams((p) => ({ ...p, chargeStrength: -v[0] }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                                <Label>Node Size</Label>
                                                <span>{vizParams.nodeSize}</span>
                                            </div>
                                            <Slider
                                                value={[vizParams.nodeSize]}
                                                min={5}
                                                max={40}
                                                step={1}
                                                onValueChange={(v) => setVizParams((p) => ({ ...p, nodeSize: v[0] }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                                <Label>Arc Curvature</Label>
                                                <span>{vizParams.arcCurvature.toFixed(1)}</span>
                                            </div>
                                            <Slider
                                                value={[vizParams.arcCurvature * 10]}
                                                min={0}
                                                max={50}
                                                step={1}
                                                onValueChange={(v) =>
                                                    setVizParams((p) => ({ ...p, arcCurvature: v[0] / 10 }))
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 flex flex-col relative bg-slate-50/30 min-h-0 min-w-0">
                    {/* Header Toolbar */}
                    <header className="h-14 border-b border-slate-200 flex items-center justify-end px-6 bg-white shadow-sm z-20 shrink-0">
                        <div className="flex items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger
                                    className={`${buttonVariants({ variant: 'ghost', size: 'icon' })} h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg`}
                                    onClick={() => (window as any).fitToScreen?.()}
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </TooltipTrigger>
                                <TooltipContent>Fit to Screen</TooltipContent>
                            </Tooltip>
                        </div>
                    </header>

                    {/* Canvas Area */}
                    <div className="flex-1 p-6 overflow-hidden min-h-0 min-w-0 relative">
                        <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden relative">
                            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-slate-200 pointer-events-none">
                                <h2 className="text-sm font-bold text-slate-800">
                                    {filteredData.name || 'OCPN Model'}
                                </h2>
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
                                    {filteredData.places.length} Places • {filteredData.transitions.length} Transitions
                                </p>
                            </div>

                            <ReactFlowProvider>
                                <div className="absolute inset-0">
                                    <ViewerCore data={filteredData} params={vizParams} />
                                </div>
                            </ReactFlowProvider>
                        </div>
                    </div>
                </main>
            </div>
        </TooltipProvider>
    );
}

// // Future implementation example for OcpnViewer.tsx
// export default function OcpnViewer({ nodeId }: { nodeId?: string }) {

//     // 1. Replace hardcoded data with your backend fetch
//     const { data: rawData, isLoading } = useQuery({
//         queryKey: ['getOcpn', nodeId],
//         queryFn: async () => {
//             const res = await fetch(`/v1/ocpn/from_ocpt/${nodeId}`);
//             return res.json();
//         },
//         enabled: !!nodeId // Only fetch if we have an ID
//     });

//     // ... keeping all your existing state and logic ...

//     if (isLoading || !filteredData) {
//         return (
//             <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-500 font-medium">
//                 Loading OCPN Data...
//             </div>
//         );
//     }

//     // ... rest of your UI ...
// }
