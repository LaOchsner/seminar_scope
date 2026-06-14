// 1 object perspective
// import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import {
//     Background,
//     Edge,
//     MarkerType,
//     Node,
//     ReactFlow,
//     ReactFlowProvider,
//     useEdgesState,
//     useNodesState,
//     useReactFlow,
// } from '@xyflow/react';
// import '@xyflow/react/dist/style.css';
// import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, Simulation } from 'd3';
// import { Activity, ArrowLeft, ChevronDown, ChevronRight, Database, Maximize2, Settings, AlertTriangle } from 'lucide-react';
// import { useNavigate, useParams } from 'react-router-dom';

// import { ArcEdge, PlaceNode, TransitionNode } from '../components/explore/miner/OcpnMinerNode.tsx';
// import { Button, buttonVariants } from '../components/ui/button';
// import { Label } from '../components/ui/label';
// import { ScrollArea } from '../components/ui/scroll-area';
// import { Separator } from '../components/ui/separator';
// import { Slider } from '../components/ui/slider';
// import { Switch } from '../components/ui/switch';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
// import { RustOcpnData } from '../types/ocpn.types';

// import { useExploreFlowStore } from '~/stores/exploreStore';
// import { getDeterministicColor } from '~/lib/colors';
// import { FileExploreNodeData } from '~/types/explore/nodeData/fileNodeData';

// export interface VizParams {
//     linkDistance: number;
//     chargeStrength: number;
//     collisionRadius: number;
//     nodeSize: number;
//     labelSize: number;
// }

// const nodeTypes = { place: PlaceNode, transition: TransitionNode };
// const edgeTypes = { arc: ArcEdge };

// // ==========================================
// // 1. CORE HEADLESS VIEWER
// // ==========================================
// const ViewerCore = ({ data, params, colorMap }: { data: RustOcpnData; params: VizParams; colorMap: Record<string, string> }) => {
//     const { fitView } = useReactFlow();
//     const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
//     const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

//     const simulationRef = useRef<Simulation<any, undefined> | null>(null);
//     const physicsNodesRef = useRef<any[]>([]);
//     const physicsLinksRef = useRef<any[]>([]);
//     const paramsRef = useRef(params);

//     useEffect(() => {
//         paramsRef.current = params;
//     }, [params]);

//     const getColor = useCallback(
//         (type: string) => colorMap[type] || getDeterministicColor(type),
//         [colorMap]
//     );

//     // ------------------------------------------
//     // Custom Top-to-Bottom BFS Layout Algorithm
//     // ------------------------------------------
//     const runBfsLayout = useCallback((currentData: RustOcpnData, currentParams: VizParams) => {
//         const nodesList = [
//             ...currentData.places.map((p) => ({ ...p, type: 'place' })),
//             ...currentData.transitions.map((t) => ({ ...t, type: 'transition' })),
//         ];

//         // Build Adjacency List & Calculate In-Degrees
//         const adj: Record<string, string[]> = {};
//         const inDegree: Record<string, number> = {};
//         nodesList.forEach((n) => {
//             adj[n.id] = [];
//             inDegree[n.id] = 0;
//         });

//         currentData.arcs.forEach((arc) => {
//             const src = typeof arc.source === 'object' ? arc.source.id : arc.source;
//             const tgt = typeof arc.target === 'object' ? arc.target.id : arc.target;
//             if (adj[src]) adj[src].push(tgt);
//             if (inDegree[tgt] !== undefined) inDegree[tgt]++;
//         });

//         const levels: Record<string, number> = {};
//         const q: string[] = [];

//         // Force the `in` node to Level 0
//         let startNodes = nodesList.filter((n) => n.initial);
//         // Fallback if no explicit initial node exists
//         if (startNodes.length === 0) startNodes = nodesList.filter((n) => inDegree[n.id] === 0);
//         if (startNodes.length === 0 && nodesList.length > 0) startNodes = [nodesList[0]];

//         startNodes.forEach((n) => {
//             levels[n.id] = 0;
//             q.push(n.id);
//         });

//         // Assign levels via Breadth-First Search
//         let maxLevel = 0;
//         while (q.length > 0) {
//             const curr = q.shift()!;
//             const currLevel = levels[curr];

//             adj[curr].forEach((neighbor) => {
//                 // Only assign if it hasn't been visited (prevents infinite loops in circular graphs)
//                 if (levels[neighbor] === undefined) {
//                     levels[neighbor] = currLevel + 1;
//                     maxLevel = Math.max(maxLevel, currLevel + 1);
//                     q.push(neighbor);
//                 }
//             });
//         }

//         // Handle completely disconnected nodes
//         nodesList.forEach((n) => {
//             if (levels[n.id] === undefined) levels[n.id] = 0;
//         });

//         // Force the `out` node to the absolute bottom (maxLevel + 1)
//         const finalNodes = nodesList.filter((n) => n.final);
//         if (finalNodes.length > 0) {
//             maxLevel++;
//             finalNodes.forEach((n) => {
//                 levels[n.id] = maxLevel;
//             });
//         }

//         // Calculate X, Y coordinates
//         const levelGroups: Record<number, any[]> = {};
//         nodesList.forEach((n) => {
//             const l = levels[n.id];
//             if (!levelGroups[l]) levelGroups[l] = [];
//             levelGroups[l].push(n);
//         });

//         const vSpacing = currentParams.linkDistance * 1.2;
//         const hSpacing = currentParams.linkDistance * 1.5;

//         const flowNodes = nodesList.map((n) => {
//             const l = levels[n.id];
//             const group = levelGroups[l];
//             const idx = group.indexOf(n);
//             const total = group.length;
            
//             // Center align nodes in their respective levels
//             const x = (idx - (total - 1) / 2) * hSpacing;
//             const y = l * vSpacing;

//             return {
//                 id: n.id,
//                 type: n.type,
//                 position: { x: x - currentParams.nodeSize, y: y - currentParams.nodeSize },
//                 data: {
//                     label: n.name || n.label || '',
//                     objectType: n.object_type,
//                     color: n.object_type ? getColor(n.object_type) : '#64748b',
//                     size: currentParams.nodeSize,
//                     labelSize: currentParams.labelSize,
//                     initial: n.initial,
//                     final: n.final,
//                     silent: n.silent,
//                 },
//             };
//         });

//         const flowEdges = currentData.arcs.map((arc) => {
//             const src = typeof arc.source === 'object' ? arc.source.id : arc.source;
//             const tgt = typeof arc.target === 'object' ? arc.target.id : arc.target;
//             const connectedPlace = currentData.places.find((p) => p.id === src || p.id === tgt);
//             const objType = connectedPlace ? connectedPlace.object_type : 'default';
//             return {
//                 id: arc.id,
//                 source: src,
//                 target: tgt,
//                 type: 'arc',
//                 data: {
//                     color: objType !== 'default' ? getColor(objType) : '#94a3b8',
//                     curvature: 0, // Force completely straight lines for the hierarchical view
//                     variable: arc.variable,
//                 },
//                 markerEnd: {
//                     type: MarkerType.ArrowClosed,
//                     color: objType !== 'default' ? getColor(objType) : '#94a3b8',
//                 },
//             };
//         });

//         return { flowNodes, flowEdges };
//     }, [getColor]);

//     // ------------------------------------------
//     // MAIN EFFECT: Topology & Data Changes
//     // ------------------------------------------
//     useEffect(() => {
//         if (!data || !data.places) return;

//         const uniqueTypes = new Set(data.places.map((p) => p.object_type));
//         const isSinglePerspective = uniqueTypes.size === 1;

//         if (isSinglePerspective) {
//             // Single perspective uses strictly positioned BFS Layout
//             if (simulationRef.current) {
//                 simulationRef.current.stop();
//                 simulationRef.current = null;
//             }

//             const { flowNodes, flowEdges } = runBfsLayout(data, paramsRef.current);
//             setNodes(flowNodes);
//             setEdges(flowEdges);
//             setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 200);

//         } else {
//             // Multiple perspectives use Force Directed Layout
//             physicsNodesRef.current = [
//                 ...data.places.map((p) => ({ ...p, type: 'place', x: Math.random() * 800, y: Math.random() * 600 })),
//                 ...data.transitions.map((t) => ({ ...t, type: 'transition', x: Math.random() * 800, y: Math.random() * 600 })),
//             ];

//             physicsLinksRef.current = data.arcs.map((arc) => {
//                 const connectedPlace = data.places.find((p) => p.id === arc.source.id || p.id === arc.target.id);
//                 return {
//                     id: arc.id,
//                     source: arc.source.id,
//                     target: arc.target.id,
//                     variable: arc.variable,
//                     objectType: connectedPlace ? connectedPlace.object_type : 'default',
//                 };
//             });

//             if (simulationRef.current) simulationRef.current.stop();

//             const sim = forceSimulation(physicsNodesRef.current)
//                 .force('link', forceLink(physicsLinksRef.current).id((d: any) => d.id).distance(paramsRef.current.linkDistance))
//                 .force('charge', forceManyBody().strength(paramsRef.current.chargeStrength))
//                 .force('center', forceCenter(400, 300))
//                 .force('collision', forceCollide().radius(paramsRef.current.collisionRadius));

//             sim.on('tick', () => {
//                 setNodes(physicsNodesRef.current.map((n: any) => ({
//                     id: n.id,
//                     type: n.type,
//                     position: { x: n.x - paramsRef.current.nodeSize, y: n.y - paramsRef.current.nodeSize },
//                     data: {
//                         label: n.name || n.label || '',
//                         objectType: n.object_type,
//                         color: n.object_type ? getColor(n.object_type) : '#64748b',
//                         size: paramsRef.current.nodeSize,
//                         labelSize: paramsRef.current.labelSize,
//                         initial: n.initial,
//                         final: n.final,
//                         silent: n.silent,
//                     },
//                 })));

//                 setEdges(physicsLinksRef.current.map((l: any) => ({
//                     id: l.id,
//                     source: l.source.id || l.source,
//                     target: l.target.id || l.target,
//                     type: 'arc',
//                     data: {
//                         color: l.objectType !== 'default' ? getColor(l.objectType) : '#94a3b8',
//                         curvature: 1.2, // Restore curved lines for the physics view
//                         variable: l.variable,
//                     },
//                     markerEnd: { type: MarkerType.ArrowClosed, color: l.objectType !== 'default' ? getColor(l.objectType) : '#94a3b8' },
//                 })));
//             });

//             simulationRef.current = sim;
//             setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 200);
//         }

//         return () => {
//             if (simulationRef.current) simulationRef.current.stop();
//         };
//     }, [data, getColor, setNodes, setEdges, fitView, runBfsLayout]);

//     // ------------------------------------------
//     // RESPONSIVE EFFECT: Parameter Slider Changes
//     // ------------------------------------------
//     useEffect(() => {
//         if (!data || !data.places) return;
//         const isSinglePerspective = new Set(data.places.map((p) => p.object_type)).size === 1;

//         if (isSinglePerspective) {
//             // Re-calculate the strict top-to-bottom grid smoothly
//             const { flowNodes, flowEdges } = runBfsLayout(data, params);
//             setNodes(flowNodes);
//             setEdges(flowEdges);
//         } else if (simulationRef.current) {
//             // Update the live physics variables
//             const sim = simulationRef.current;
//             (sim.force('link') as any).distance(params.linkDistance);
//             (sim.force('charge') as any).strength(params.chargeStrength);
//             (sim.force('collision') as any).radius(params.collisionRadius);
//             sim.alpha(0.3).restart();
//         }
//     }, [params, data, setNodes, setEdges, runBfsLayout]);

//     return (
//         <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitViewOptions={{ padding: 0.2 }}>
//             <Background gap={20} color="#f1f5f9" />
//         </ReactFlow>
//     );
// };

// // ==========================================
// // 2. MAIN LAYOUT
// // ==========================================
// export default function OcpnViewer({ nodeId: propNodeId }: { nodeId?: string }) {
//     const navigate = useNavigate();
//     const params = useParams<{ nodeId: string }>();
//     const nodeId = propNodeId || params.nodeId;
//     const [isExiting, setIsExiting] = useState(false);

//     const { getNode } = useExploreFlowStore();
//     const node = nodeId ? getNode(nodeId) : undefined;
//     const nodeData = node?.data as FileExploreNodeData | undefined;

//     const rawData = (nodeData?.processedData as RustOcpnData) || null;
//     const colorMap = (nodeData?.colorMap as Record<string, string>) || {};

//     const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['objects', 'styling']));
//     const [vizParams, setVizParams] = useState<VizParams>({ linkDistance: 120, chargeStrength: -400, collisionRadius: 45, nodeSize: 18, labelSize: 11 });

//     const allObjectTypes = useMemo(() => Array.from(new Set(rawData?.places?.map((p) => p.object_type) || [])), [rawData]);
//     const [visibleObjectTypes, setVisibleObjectTypes] = useState<Set<string>>(new Set());

//     useEffect(() => {
//         if (allObjectTypes.length > 0 && visibleObjectTypes.size === 0) {
//             setVisibleObjectTypes(new Set(allObjectTypes));
//         }
//     }, [allObjectTypes]);

//     const filteredData = useMemo(() => {
//         if (!rawData || !rawData.places) return null;
//         const places = rawData.places.filter((p) => visibleObjectTypes.has(p.object_type));
//         const placeIds = new Set(places.map((p) => p.id));
//         const arcs = rawData.arcs.filter((a) => placeIds.has(a.source.id) || placeIds.has(a.target.id));
//         const connectedNodeIds = new Set();
//         arcs.forEach((a) => { connectedNodeIds.add(a.source.id); connectedNodeIds.add(a.target.id); });
//         const transitions = rawData.transitions.filter((t) => connectedNodeIds.has(t.id));
//         return { ...rawData, places, arcs, transitions };
//     }, [rawData, visibleObjectTypes]);

//     const toggleSection = (id: string) => {
//         const next = new Set(expandedSections);
//         if (next.has(id)) next.delete(id); else next.add(id);
//         setExpandedSections(next);
//     };

//     const toggleObjectType = (type: string) => {
//         const next = new Set(visibleObjectTypes);
//         if (next.has(type)) next.delete(type); else next.add(type);
//         setVisibleObjectTypes(next);
//     };

//     const handleBackToPipeline = () => {
//         setIsExiting(true);
//         setTimeout(() => navigate('/data/pipeline/explore'), 50);
//     };

//     if (!rawData || !rawData.places) {
//         return (
//             <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-slate-50 text-slate-500 font-medium">
//                 <AlertTriangle className="w-10 h-10 text-amber-500" />
//                 <h2 className="text-lg font-bold text-slate-700">Incomplete Data</h2>
//                 <p className="text-sm text-slate-500 max-w-md text-center">
//                     The backend payload is missing or not formatted correctly. Ensure `processedData` contains `places` and `transitions`.
//                 </p>
//                 <Button variant="outline" onClick={handleBackToPipeline}>Return to Pipeline</Button>
//             </div>
//         );
//     }

//     return (
//         <TooltipProvider>
//             <div className="flex absolute inset-0 w-full h-full bg-white text-slate-900 font-sans overflow-hidden">
//                 <aside className="w-72 border-r border-slate-200 flex flex-col bg-white z-10 shadow-sm shrink-0">
//                     <div className="p-5 border-b border-slate-100 bg-slate-50/50">
//                         <div className="flex items-center gap-2">
//                             <Activity className="w-5 h-5 text-blue-600" />
//                             <h1 className="text-lg font-bold tracking-tight text-slate-800">OCPN Visualizer</h1>
//                         </div>
//                     </div>
//                     <ScrollArea className="flex-1 min-h-0">
//                         <div className="p-4 space-y-1">
//                             <div className="space-y-1">
//                                 <button onClick={() => toggleSection('objects')} className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md transition-colors group">
//                                     <div className="flex items-center gap-2">
//                                         <Database className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
//                                         <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Object Perspectives</span>
//                                     </div>
//                                     {expandedSections.has('objects') ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
//                                 </button>
//                                 {expandedSections.has('objects') && (
//                                     <div className="overflow-hidden pl-4 space-y-1 mt-1">
//                                         {allObjectTypes.map((type) => {
//                                             const objColor = colorMap?.[type] || getDeterministicColor(type);
//                                             return (
//                                                 <div key={type} className="flex items-center justify-between p-2 hover:bg-slate-50/50 rounded-md">
//                                                     <Label htmlFor={`toggle-${type}`} className="text-xs text-slate-600 capitalize cursor-pointer flex-1 flex items-center gap-2">
//                                                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: objColor }} />
//                                                         {type}
//                                                     </Label>
//                                                     <Switch id={`toggle-${type}`} checked={visibleObjectTypes.has(type)} onCheckedChange={() => toggleObjectType(type)} className="scale-75" />
//                                                 </div>
//                                             );
//                                         })}
//                                     </div>
//                                 )}
//                             </div>
//                             <Separator className="my-2 bg-slate-100" />
//                             <div className="space-y-1">
//                                 <button onClick={() => toggleSection('styling')} className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md transition-colors group">
//                                     <div className="flex items-center gap-2">
//                                         <Settings className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
//                                         <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Styling</span>
//                                     </div>
//                                     {expandedSections.has('styling') ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
//                                 </button>
//                                 {expandedSections.has('styling') && (
//                                     <div className="overflow-hidden pl-4 pr-2 py-3 space-y-5">
//                                         <div className="space-y-2"><div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><Label>Link Distance</Label><span>{vizParams.linkDistance}</span></div><Slider value={[vizParams.linkDistance]} min={50} max={300} step={10} onValueChange={(v) => setVizParams((p) => ({ ...p, linkDistance: v[0] }))} /></div>
//                                         <div className="space-y-2"><div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><Label>Repulsion</Label><span>{Math.abs(vizParams.chargeStrength)}</span></div><Slider value={[Math.abs(vizParams.chargeStrength)]} min={100} max={1000} step={50} onValueChange={(v) => setVizParams((p) => ({ ...p, chargeStrength: -v[0] }))} /></div>
//                                         <div className="space-y-2"><div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><Label>Node Size</Label><span>{vizParams.nodeSize}</span></div><Slider value={[vizParams.nodeSize]} min={5} max={40} step={1} onValueChange={(v) => setVizParams((p) => ({ ...p, nodeSize: v[0] }))} /></div>
//                                     </div>
//                                 )}
//                             </div>
//                         </div>
//                     </ScrollArea>
//                     <div className="p-4 border-t border-slate-200 bg-slate-50/50">
//                         <Button variant="outline" className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-700 transition-colors" onClick={handleBackToPipeline} disabled={isExiting}>
//                             {isExiting ? <><Activity className="w-4 h-4 animate-spin text-blue-500" />Returning...</> : <><ArrowLeft className="w-4 h-4" />Back to Pipeline</>}
//                         </Button>
//                     </div>
//                 </aside>
//                 <main className="flex-1 flex flex-col relative bg-slate-50/30 min-h-0 min-w-0">
//                     <header className="h-14 border-b border-slate-200 flex items-center justify-end px-6 bg-white shadow-sm z-20 shrink-0">
//                         <Tooltip>
//                             <TooltipTrigger className={`${buttonVariants({ variant: 'ghost', size: 'icon' })} h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg`} onClick={() => (window as any).fitToScreen?.()}><Maximize2 className="w-4 h-4" /></TooltipTrigger>
//                             <TooltipContent>Fit to Screen</TooltipContent>
//                         </Tooltip>
//                     </header>
//                     <div className="flex-1 p-6 overflow-hidden min-h-0 min-w-0 relative">
//                         <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden relative">
//                             {isExiting ? (
//                                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-50">
//                                     <Activity className="w-8 h-8 text-blue-500 animate-spin mb-4" />
//                                     <p className="text-sm font-semibold text-slate-600 tracking-wide">Loading Pipeline...</p>
//                                 </div>
//                             ) : (
//                                 <ReactFlowProvider>
//                                     <div className="absolute inset-0">
//                                         <ViewerCore data={filteredData!} params={vizParams} colorMap={colorMap} />
//                                     </div>
//                                 </ReactFlowProvider>
//                             )}
//                         </div>
//                     </div>
//                 </main>
//             </div>
//         </TooltipProvider>
//     );
// }

// 2 object perspectives logic
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
import { Activity, ArrowLeft, ChevronDown, ChevronRight, Database, Maximize2, Settings, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ArcEdge, PlaceNode, TransitionNode } from '../components/explore/miner/OcpnMinerNode.tsx';
import { Button, buttonVariants } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { RustOcpnData } from '../types/ocpn.types';

import { useExploreFlowStore } from '~/stores/exploreStore';
import { getDeterministicColor } from '~/lib/colors';
import { FileExploreNodeData } from '~/types/explore/nodeData/fileNodeData';

export interface VizParams {
    linkDistance: number;
    chargeStrength: number;
    collisionRadius: number;
    nodeSize: number;
    labelSize: number;
}

const nodeTypes = { place: PlaceNode, transition: TransitionNode };
const edgeTypes = { arc: ArcEdge };

// Helper to safely extract IDs
const getArcId = (endpoint: any) => (typeof endpoint === 'object' && endpoint !== null ? endpoint.id : endpoint);

// ==========================================
// 1. CORE HEADLESS VIEWER
// ==========================================
const ViewerCore = ({ data, params, colorMap }: { data: RustOcpnData; params: VizParams; colorMap: Record<string, string> }) => {
    const { fitView } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const simulationRef = useRef<Simulation<any, undefined> | null>(null);
    const paramsRef = useRef(params);

    useEffect(() => {
        paramsRef.current = params;
    }, [params]);

    const getColor = useCallback(
        (type: string) => colorMap[type] || getDeterministicColor(type),
        [colorMap]
    );

    // ------------------------------------------
    // Custom Top-to-Bottom BFS Layout
    // ------------------------------------------
    const runBfsLayout = useCallback((currentData: RustOcpnData, currentParams: VizParams) => {
        const nodesList = [
            ...currentData.places.map((p) => ({ ...p, type: 'place' })),
            ...(currentData.transitions || []).map((t) => ({ ...t, type: 'transition' })),
        ];

        const adj: Record<string, string[]> = {};
        const inDegree: Record<string, number> = {};
        nodesList.forEach((n) => { adj[n.id] = []; inDegree[n.id] = 0; });

        const rawArcs = currentData.arcs || [];
        const validNodeIds = new Set(nodesList.map(n => n.id));
        const validArcs = rawArcs.filter(arc => validNodeIds.has(getArcId(arc.source)) && validNodeIds.has(getArcId(arc.target)));

        validArcs.forEach((arc) => {
            const src = getArcId(arc.source);
            const tgt = getArcId(arc.target);
            adj[src].push(tgt);
            inDegree[tgt]++;
        });

        const levels: Record<string, number> = {};
        let startNodes = nodesList.filter((n) => (n as any).initial);
        if (startNodes.length === 0) startNodes = nodesList.filter((n) => inDegree[n.id] === 0);
        if (startNodes.length === 0 && nodesList.length > 0) startNodes = [nodesList[0]];

        const q: string[] = startNodes.map(n => n.id);
        startNodes.forEach((n) => { levels[n.id] = 0; });

        while (q.length > 0) {
            const curr = q.shift()!;
            const currLevel = levels[curr];

            (adj[curr] || []).forEach((neighbor) => {
                if (levels[neighbor] === undefined) {
                    levels[neighbor] = currLevel + 1;
                    q.push(neighbor);
                }
            });
        }

        nodesList.forEach((n) => {
            if (levels[n.id] === undefined) levels[n.id] = 0;
        });

        let maxLevel = Math.max(0, ...Object.values(levels));
        const finalNodes = nodesList.filter((n) => (n as any).final);
        if (finalNodes.length > 0) {
            maxLevel++;
            finalNodes.forEach((n) => { levels[n.id] = maxLevel; });
        }

        const levelGroups: Record<number, any[]> = {};
        nodesList.forEach((n) => {
            const l = levels[n.id];
            if (!levelGroups[l]) levelGroups[l] = [];
            levelGroups[l].push(n);
        });

        const vSpacing = currentParams.linkDistance * 1.2;
        const hSpacing = currentParams.linkDistance * 1.5;

        const flowNodes = nodesList.map((n) => {
            const l = levels[n.id];
            const group = levelGroups[l];
            
            group.sort((a, b) => ((a.object_type || '') > (b.object_type || '') ? 1 : -1));
            
            const idx = group.indexOf(n);
            const total = group.length;
            
            const x = (idx - (total - 1) / 2) * hSpacing;
            const y = l * vSpacing;

            return {
                id: n.id,
                type: n.type as string,
                position: { x: x - currentParams.nodeSize, y: y - currentParams.nodeSize },
                data: {
                    label: n.name || n.label || '',
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
            const src = getArcId(arc.source);
            const tgt = getArcId(arc.target);
            const connectedPlace = currentData.places.find((p) => p.id === src || p.id === tgt);
            const objType = connectedPlace ? connectedPlace.object_type : 'default';
            
            return {
                id: arc.id,
                source: src,
                target: tgt,
                type: 'arc',
                data: {
                    color: objType !== 'default' ? getColor(objType) : '#94a3b8',
                    // 🛡️ CRITICAL FIX: Straight lines prevent massive horizontal zoom out
                    curvature: 0, 
                    variable: arc.variable,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: objType !== 'default' ? getColor(objType) : '#94a3b8',
                },
            };
        });

        return { flowNodes, flowEdges };
    }, [getColor]);

    // ------------------------------------------
    // MAIN EFFECT: ADAPTIVE LAYOUT
    // ------------------------------------------
    useEffect(() => {
        if (!data || !data.places) return;

        const uniqueTypes = new Set(data.places.map((p) => p.object_type));
        
        // Use Strict Mathematical Grid for 1 or 2 perspectives. Use Physics for 3+
        const useStructuredLayout = uniqueTypes.size <= 2;

        if (useStructuredLayout) {
            // STOP PHYSICS ENGINE
            if (simulationRef.current) {
                simulationRef.current.stop();
                simulationRef.current = null;
            }

            const { flowNodes, flowEdges } = runBfsLayout(data, paramsRef.current);
            setNodes(flowNodes);
            setEdges(flowEdges);
            setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 200);

        } else {
            // START PHYSICS ENGINE (3+ Perspectives)
            const nodesList = [
                ...data.places.map((p) => ({ ...p, type: 'place' as const })),
                ...(data.transitions || []).map((t) => ({ ...t, type: 'transition' as const })),
            ];

            const validNodeIds = new Set(nodesList.map(n => n.id));
            const rawArcs = (data.arcs || []).filter(arc => validNodeIds.has(getArcId(arc.source)) && validNodeIds.has(getArcId(arc.target)));

            const physicsNodesRef = nodesList.map((n) => ({ ...n, x: Math.random() * 800, y: Math.random() * 600 }));
            const physicsLinksRef = rawArcs.map((arc) => {
                const src = getArcId(arc.source);
                const tgt = getArcId(arc.target);
                const connectedPlace = data.places.find((p) => p.id === src || p.id === tgt);
                return {
                    id: arc.id,
                    source: src,
                    target: tgt,
                    variable: arc.variable,
                    objectType: connectedPlace ? connectedPlace.object_type : 'default',
                };
            });

            if (simulationRef.current) simulationRef.current.stop();

            const sim = forceSimulation(physicsNodesRef)
                .force('link', forceLink(physicsLinksRef).id((d: any) => d.id).distance(paramsRef.current.linkDistance))
                .force('charge', forceManyBody().strength(paramsRef.current.chargeStrength))
                .force('center', forceCenter(400, 300))
                .force('collide', forceCollide().radius(paramsRef.current.collisionRadius));

            sim.on('tick', () => {
                setNodes(physicsNodesRef.map((n: any) => ({
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
                })));

                setEdges(physicsLinksRef.map((l: any) => ({
                    id: l.id,
                    source: l.source.id || l.source,
                    target: l.target.id || l.target,
                    type: 'arc',
                    data: {
                        color: l.objectType !== 'default' ? getColor(l.objectType) : '#94a3b8',
                        // Maintain curves for physics graph since lines aren't rigidly vertical
                        curvature: 1.2, 
                        variable: l.variable,
                    },
                    markerEnd: { type: MarkerType.ArrowClosed, color: l.objectType !== 'default' ? getColor(l.objectType) : '#94a3b8' },
                })));
            });

            simulationRef.current = sim;
            setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 200);
        }

        return () => {
            if (simulationRef.current) simulationRef.current.stop();
        };
    }, [data, getColor, setNodes, setEdges, fitView, runBfsLayout]);

    // ------------------------------------------
    // RESPONSIVE EFFECT: Parameter Slider Changes
    // ------------------------------------------
    useEffect(() => {
        if (!data || !data.places) return;
        const uniqueTypes = new Set(data.places.map((p) => p.object_type));
        const useStructuredLayout = uniqueTypes.size <= 2;

        if (useStructuredLayout) {
            // Re-run math layout immediately when sliders change
            const { flowNodes, flowEdges } = runBfsLayout(data, params);
            setNodes(flowNodes);
            setEdges(flowEdges);
        } else if (simulationRef.current) {
            // Live update physics parameters
            const sim = simulationRef.current;
            (sim.force('link') as any).distance(params.linkDistance);
            (sim.force('charge') as any).strength(params.chargeStrength);
            (sim.force('collide') as any).radius(params.collisionRadius);
            sim.alpha(0.3).restart();
        }
    }, [params, data, setNodes, setEdges, runBfsLayout]);

    return (
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitViewOptions={{ padding: 0.2 }}>
            <Background gap={20} color="#f1f5f9" />
        </ReactFlow>
    );
};

// ==========================================
// 2. MAIN LAYOUT
// ==========================================
export default function OcpnViewer({ nodeId: propNodeId }: { nodeId?: string }) {
    const navigate = useNavigate();
    const params = useParams<{ nodeId: string }>();
    const nodeId = propNodeId || params.nodeId;
    const [isExiting, setIsExiting] = useState(false);

    const { getNode } = useExploreFlowStore();
    const node = nodeId ? getNode(nodeId) : undefined;
    const nodeData = node?.data as FileExploreNodeData | undefined;

    const rawData = (nodeData?.processedData as RustOcpnData) || null;
    const colorMap = (nodeData?.colorMap as Record<string, string>) || {};

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['objects', 'styling']));
    const [vizParams, setVizParams] = useState<VizParams>({ linkDistance: 120, chargeStrength: -400, collisionRadius: 45, nodeSize: 18, labelSize: 11 });

    const allObjectTypes = useMemo(() => Array.from(new Set(rawData?.places?.map((p) => p.object_type) || [])), [rawData]);
    const [visibleObjectTypes, setVisibleObjectTypes] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (allObjectTypes.length > 0 && visibleObjectTypes.size === 0) {
            setVisibleObjectTypes(new Set(allObjectTypes));
        }
    }, [allObjectTypes]);

    const filteredData = useMemo(() => {
        if (!rawData || !rawData.places) return null;
        
        const places = rawData.places.filter((p) => visibleObjectTypes.has(p.object_type));
        const placeIds = new Set(places.map((p) => p.id));
        
        const rawArcs = rawData.arcs || [];
        const candidateArcs = rawArcs.filter((a) => {
            const src = getArcId(a.source);
            const tgt = getArcId(a.target);
            return placeIds.has(src) || placeIds.has(tgt);
        });
        
        const connectedNodeIds = new Set();
        candidateArcs.forEach((a) => { 
            connectedNodeIds.add(getArcId(a.source)); 
            connectedNodeIds.add(getArcId(a.target)); 
        });
        
        const transitions = (rawData.transitions || []).filter((t) => connectedNodeIds.has(t.id));
        const transitionIds = new Set(transitions.map((t) => t.id));

        const finalValidNodeIds = new Set([...placeIds, ...transitionIds]);
        const arcs = candidateArcs.filter((a) => {
            return finalValidNodeIds.has(getArcId(a.source)) && finalValidNodeIds.has(getArcId(a.target));
        });
        
        return { ...rawData, places, arcs, transitions };
    }, [rawData, visibleObjectTypes]);

    const toggleSection = (id: string) => {
        const next = new Set(expandedSections);
        if (next.has(id)) next.delete(id); else next.add(id);
        setExpandedSections(next);
    };

    const toggleObjectType = (type: string) => {
        const next = new Set(visibleObjectTypes);
        if (next.has(type)) next.delete(type); else next.add(type);
        setVisibleObjectTypes(next);
    };

    const handleBackToPipeline = () => {
        setIsExiting(true);
        setTimeout(() => navigate('/data/pipeline/explore'), 50);
    };

    if (!rawData || !rawData.places) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-slate-50 text-slate-500 font-medium">
                <AlertTriangle className="w-10 h-10 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-700">Incomplete Data</h2>
                <p className="text-sm text-slate-500 max-w-md text-center">
                    The backend payload is missing or not formatted correctly. Ensure `processedData` contains `places` and `transitions`.
                </p>
                <Button variant="outline" onClick={handleBackToPipeline}>Return to Pipeline</Button>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="flex absolute inset-0 w-full h-full bg-white text-slate-900 font-sans overflow-hidden">
                <aside className="w-72 border-r border-slate-200 flex flex-col bg-white z-10 shadow-sm shrink-0">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" />
                            <h1 className="text-lg font-bold tracking-tight text-slate-800">OCPN Visualizer</h1>
                        </div>
                    </div>
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-4 space-y-1">
                            <div className="space-y-1">
                                <button onClick={() => toggleSection('objects')} className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md transition-colors group">
                                    <div className="flex items-center gap-2">
                                        <Database className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Object Perspectives</span>
                                    </div>
                                    {expandedSections.has('objects') ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                                </button>
                                {expandedSections.has('objects') && (
                                    <div className="overflow-hidden pl-4 space-y-1 mt-1">
                                        {allObjectTypes.map((type) => {
                                            const objColor = colorMap?.[type] || getDeterministicColor(type);
                                            return (
                                                <div key={type} className="flex items-center justify-between p-2 hover:bg-slate-50/50 rounded-md">
                                                    <Label htmlFor={`toggle-${type}`} className="text-xs text-slate-600 capitalize cursor-pointer flex-1 flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: objColor }} />
                                                        {type}
                                                    </Label>
                                                    <Switch id={`toggle-${type}`} checked={visibleObjectTypes.has(type)} onCheckedChange={() => toggleObjectType(type)} className="scale-75" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <Separator className="my-2 bg-slate-100" />
                            <div className="space-y-1">
                                <button onClick={() => toggleSection('styling')} className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md transition-colors group">
                                    <div className="flex items-center gap-2">
                                        <Settings className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Styling</span>
                                    </div>
                                    {expandedSections.has('styling') ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                                </button>
                                {expandedSections.has('styling') && (
                                    <div className="overflow-hidden pl-4 pr-2 py-3 space-y-5">
                                        <div className="space-y-2"><div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><Label>Link Distance</Label><span>{vizParams.linkDistance}</span></div><Slider value={[vizParams.linkDistance]} min={50} max={300} step={10} onValueChange={(v) => setVizParams((p) => ({ ...p, linkDistance: v[0] }))} /></div>
                                        <div className="space-y-2"><div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><Label>Repulsion</Label><span>{Math.abs(vizParams.chargeStrength)}</span></div><Slider value={[Math.abs(vizParams.chargeStrength)]} min={100} max={1000} step={50} onValueChange={(v) => setVizParams((p) => ({ ...p, chargeStrength: -v[0] }))} /></div>
                                        <div className="space-y-2"><div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><Label>Node Size</Label><span>{vizParams.nodeSize}</span></div><Slider value={[vizParams.nodeSize]} min={5} max={40} step={1} onValueChange={(v) => setVizParams((p) => ({ ...p, nodeSize: v[0] }))} /></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                        <Button variant="outline" className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-700 transition-colors" onClick={handleBackToPipeline} disabled={isExiting}>
                            {isExiting ? <><Activity className="w-4 h-4 animate-spin text-blue-500" />Returning...</> : <><ArrowLeft className="w-4 h-4" />Back to Pipeline</>}
                        </Button>
                    </div>
                </aside>
                <main className="flex-1 flex flex-col relative bg-slate-50/30 min-h-0 min-w-0">
                    <header className="h-14 border-b border-slate-200 flex items-center justify-end px-6 bg-white shadow-sm z-20 shrink-0">
                        <Tooltip>
                            <TooltipTrigger className={`${buttonVariants({ variant: 'ghost', size: 'icon' })} h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg`} onClick={() => (window as any).fitToScreen?.()}><Maximize2 className="w-4 h-4" /></TooltipTrigger>
                            <TooltipContent>Fit to Screen</TooltipContent>
                        </Tooltip>
                    </header>
                    <div className="flex-1 p-6 overflow-hidden min-h-0 min-w-0 relative">
                        <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden relative">
                            {isExiting ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-50">
                                    <Activity className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                                    <p className="text-sm font-semibold text-slate-600 tracking-wide">Loading Pipeline...</p>
                                </div>
                            ) : (
                                <ReactFlowProvider>
                                    <div className="absolute inset-0">
                                        <ViewerCore data={filteredData!} params={vizParams} colorMap={colorMap} />
                                    </div>
                                </ReactFlowProvider>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </TooltipProvider>
    );
}