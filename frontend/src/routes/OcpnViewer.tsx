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
// import { Activity, ArrowLeft, ChevronDown, ChevronRight, Database, Maximize2, Settings } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// // Miner Nodes & Types
// import { ArcEdge, PlaceNode, TransitionNode } from '../components/explore/miner/OcpnMinerNode.tsx';
// // UI Components (Using relative paths instead of @/)
// import { Button, buttonVariants } from '../components/ui/button';
// import { Label } from '../components/ui/label';
// import { ScrollArea } from '../components/ui/scroll-area';
// import { Separator } from '../components/ui/separator';
// import { Slider } from '../components/ui/slider';
// import { Switch } from '../components/ui/switch';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
// import { RustOcpnData } from '../types/ocpn.types';
// // HARDCODED IMPORT: Adjust path as needed
// import hardcodedOcpnData from '/Users/ekanshagarwal/Desktop/Hiwi_proj/scope/example_data/rust_ocpn.json';
// // Types & Config (Arc curvature removed)
// export interface VizParams {
//     linkDistance: number;
//     chargeStrength: number;
//     collisionRadius: number;
//     nodeSize: number;
//     labelSize: number;
// }
// const nodeTypes = { place: PlaceNode, transition: TransitionNode };
// const edgeTypes = { arc: ArcEdge };
// const modernColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
// // ==========================================
// // 1. CORE HEADLESS VIEWER
// // ==========================================
// const ViewerCore = ({ data, params }: { data: RustOcpnData; params: VizParams }) => {
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
//     const objectTypes = useMemo(() => Array.from(new Set(data.places.map((p) => p.object_type))), [data]);
//     const getColor = useCallback(
//         (type: string) => {
//             const idx = objectTypes.indexOf(type);
//             return modernColors[Math.max(0, idx) % modernColors.length];
//         },
//         [objectTypes]
//     );
//     // Initial Physics Setup
//     useEffect(() => {
//         if (!data || !data.places) return;
//         physicsNodesRef.current = [
//             ...data.places.map((p) => ({ ...p, type: 'place', x: Math.random() * 800, y: Math.random() * 600 })),
//             ...data.transitions.map((t) => ({
//                 ...t,
//                 type: 'transition',
//                 x: Math.random() * 800,
//                 y: Math.random() * 600,
//             })),
//         ];
//         physicsLinksRef.current = data.arcs.map((arc) => {
//             const connectedPlace = data.places.find((p) => p.id === arc.source.id || p.id === arc.target.id);
//             return {
//                 id: arc.id,
//                 source: arc.source.id,
//                 target: arc.target.id,
//                 variable: arc.variable,
//                 objectType: connectedPlace ? connectedPlace.object_type : 'default',
//             };
//         });
//         if (simulationRef.current) simulationRef.current.stop();
//         const sim = forceSimulation(physicsNodesRef.current)
//             .force(
//                 'link',
//                 forceLink(physicsLinksRef.current)
//                     .id((d: any) => d.id)
//                     .distance(paramsRef.current.linkDistance)
//             )
//             .force('charge', forceManyBody().strength(paramsRef.current.chargeStrength))
//             .force('center', forceCenter(400, 300))
//             .force('collision', forceCollide().radius(paramsRef.current.collisionRadius));
//         sim.on('tick', () => {
//             const flowNodes = physicsNodesRef.current.map((n: any) => ({
//                 id: n.id,
//                 type: n.type,
//                 position: { x: n.x - paramsRef.current.nodeSize, y: n.y - paramsRef.current.nodeSize },
//                 data: {
//                     label: n.name || n.label || '',
//                     objectType: n.object_type,
//                     color: n.object_type ? getColor(n.object_type) : '#64748b',
//                     size: paramsRef.current.nodeSize,
//                     labelSize: paramsRef.current.labelSize,
//                     initial: n.initial,
//                     final: n.final,
//                     silent: n.silent,
//                 },
//             }));
//             const flowEdges = physicsLinksRef.current.map((l: any) => ({
//                 id: l.id,
//                 source: l.source.id || l.source,
//                 target: l.target.id || l.target,
//                 type: 'arc',
//                 data: {
//                     color: l.objectType !== 'default' ? getColor(l.objectType) : '#94a3b8',
//                     curvature: 1.2, // Hardcoded default curvature
//                     variable: l.variable,
//                 },
//                 markerEnd: {
//                     type: MarkerType.ArrowClosed,
//                     color: l.objectType !== 'default' ? getColor(l.objectType) : '#94a3b8',
//                 },
//             }));
//             setNodes(flowNodes);
//             setEdges(flowEdges);
//         });
//         simulationRef.current = sim;
//         setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 500);
//         return () => sim.stop();
//     }, [data, getColor, setNodes, setEdges, fitView]);
//     // Dynamic Parameter Updates (Sliders)
//     useEffect(() => {
//         if (!simulationRef.current) return;
//         const sim = simulationRef.current;
//         (sim.force('link') as any).distance(params.linkDistance);
//         (sim.force('charge') as any).strength(params.chargeStrength);
//         (sim.force('collision') as any).radius(params.collisionRadius);
//         sim.alpha(0.3).restart();
//     }, [params.linkDistance, params.chargeStrength, params.collisionRadius]);
//     return (
//         <ReactFlow
//             nodes={nodes}
//             edges={edges}
//             onNodesChange={onNodesChange}
//             onEdgesChange={onEdgesChange}
//             nodeTypes={nodeTypes}
//             edgeTypes={edgeTypes}
//             fitViewOptions={{ padding: 0.2 }}
//         >
//             <Background gap={20} color="#f1f5f9" />
//         </ReactFlow>
//     );
// };
// // ==========================================
// // 2. MAIN LAYOUT (SIDEBAR + CANVAS)
// // ==========================================
// export default function OcpnViewer({ nodeId }: { nodeId?: string }) {
//     const navigate = useNavigate();
//     const rawData = hardcodedOcpnData as unknown as RustOcpnData;
//     // UI State
//     const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['objects', 'styling']));
//     const [vizParams, setVizParams] = useState<VizParams>({
//         linkDistance: 120,
//         chargeStrength: -400,
//         collisionRadius: 45,
//         nodeSize: 18,
//         labelSize: 11,
//     });
//     // Object Types State
//     const allObjectTypes = useMemo(
//         () => Array.from(new Set(rawData?.places?.map((p) => p.object_type) || [])),
//         [rawData]
//     );
//     const [visibleObjectTypes, setVisibleObjectTypes] = useState<Set<string>>(new Set(allObjectTypes));
//     // Ensure state initializes if data loads slightly late
//     useEffect(() => {
//         if (allObjectTypes.length > 0 && visibleObjectTypes.size === 0) {
//             setVisibleObjectTypes(new Set(allObjectTypes));
//         }
//     }, [allObjectTypes]);
//     // Filter data based on toggles
//     const filteredData = useMemo(() => {
//         if (!rawData || !rawData.places) return null;
//         const places = rawData.places.filter((p) => visibleObjectTypes.has(p.object_type));
//         const placeIds = new Set(places.map((p) => p.id));
//         // Keep arcs that connect to at least one visible place
//         const arcs = rawData.arcs.filter((a) => placeIds.has(a.source.id) || placeIds.has(a.target.id));
//         // Keep transitions connected to remaining arcs
//         const connectedNodeIds = new Set();
//         arcs.forEach((a) => {
//             connectedNodeIds.add(a.source.id);
//             connectedNodeIds.add(a.target.id);
//         });
//         const transitions = rawData.transitions.filter((t) => connectedNodeIds.has(t.id));
//         return { ...rawData, places, arcs, transitions };
//     }, [rawData, visibleObjectTypes]);
//     const toggleSection = (id: string) => {
//         const next = new Set(expandedSections);
//         if (next.has(id)) next.delete(id);
//         else next.add(id);
//         setExpandedSections(next);
//     };
//     const toggleObjectType = (type: string) => {
//         const next = new Set(visibleObjectTypes);
//         if (next.has(type)) next.delete(type);
//         else next.add(type);
//         setVisibleObjectTypes(next);
//     };
//     if (!filteredData) {
//         return (
//             <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-500 font-medium">
//                 Loading Data...
//             </div>
//         );
//     }
//     return (
//         <TooltipProvider>
//             <div className="flex absolute inset-0 w-full h-full bg-white text-slate-900 font-sans overflow-hidden">
//                 {/* SIDEBAR */}
//                 <aside className="w-72 border-r border-slate-200 flex flex-col bg-white z-10 shadow-sm shrink-0">
//                     <div className="p-5 border-b border-slate-100 bg-slate-50/50">
//                         <div className="flex items-center gap-2">
//                             <Activity className="w-5 h-5 text-blue-600" />
//                             <h1 className="text-lg font-bold tracking-tight text-slate-800">OCPN Visualizer</h1>
//                         </div>
//                     </div>
//                     <ScrollArea className="flex-1 min-h-0">
//                         <div className="p-4 space-y-1">
//                             {/* Object Perspectives */}
//                             <div className="space-y-1">
//                                 <button
//                                     onClick={() => toggleSection('objects')}
//                                     className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md transition-colors group"
//                                 >
//                                     <div className="flex items-center gap-2">
//                                         <Database className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
//                                         <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
//                                             Object Perspectives
//                                         </span>
//                                     </div>
//                                     {expandedSections.has('objects') ? (
//                                         <ChevronDown className="w-3 h-3 text-slate-400" />
//                                     ) : (
//                                         <ChevronRight className="w-3 h-3 text-slate-400" />
//                                     )}
//                                 </button>
//                                 {expandedSections.has('objects') && (
//                                     <div className="overflow-hidden pl-4 space-y-1 mt-1">
//                                         {allObjectTypes.map((type) => (
//                                             <div
//                                                 key={type}
//                                                 className="flex items-center justify-between p-2 hover:bg-slate-50/50 rounded-md"
//                                             >
//                                                 <Label
//                                                     htmlFor={`toggle-${type}`}
//                                                     className="text-xs text-slate-600 capitalize cursor-pointer flex-1"
//                                                 >
//                                                     {type}
//                                                 </Label>
//                                                 <Switch
//                                                     id={`toggle-${type}`}
//                                                     checked={visibleObjectTypes.has(type)}
//                                                     onCheckedChange={() => toggleObjectType(type)}
//                                                     className="scale-75"
//                                                 />
//                                             </div>
//                                         ))}
//                                     </div>
//                                 )}
//                             </div>
//                             <Separator className="my-2 bg-slate-100" />
//                             {/* Styling Configurations */}
//                             <div className="space-y-1">
//                                 <button
//                                     onClick={() => toggleSection('styling')}
//                                     className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md transition-colors group"
//                                 >
//                                     <div className="flex items-center gap-2">
//                                         <Settings className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
//                                         <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
//                                             Styling
//                                         </span>
//                                     </div>
//                                     {expandedSections.has('styling') ? (
//                                         <ChevronDown className="w-3 h-3 text-slate-400" />
//                                     ) : (
//                                         <ChevronRight className="w-3 h-3 text-slate-400" />
//                                     )}
//                                 </button>
//                                 {expandedSections.has('styling') && (
//                                     <div className="overflow-hidden pl-4 pr-2 py-3 space-y-5">
//                                         <div className="space-y-2">
//                                             <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
//                                                 <Label>Link Distance</Label>
//                                                 <span>{vizParams.linkDistance}</span>
//                                             </div>
//                                             <Slider
//                                                 value={[vizParams.linkDistance]}
//                                                 min={50}
//                                                 max={300}
//                                                 step={10}
//                                                 onValueChange={(v) =>
//                                                     setVizParams((p) => ({ ...p, linkDistance: v[0] }))
//                                                 }
//                                             />
//                                         </div>
//                                         <div className="space-y-2">
//                                             <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
//                                                 <Label>Repulsion</Label>
//                                                 <span>{Math.abs(vizParams.chargeStrength)}</span>
//                                             </div>
//                                             <Slider
//                                                 value={[Math.abs(vizParams.chargeStrength)]}
//                                                 min={100}
//                                                 max={1000}
//                                                 step={50}
//                                                 onValueChange={(v) =>
//                                                     setVizParams((p) => ({ ...p, chargeStrength: -v[0] }))
//                                                 }
//                                             />
//                                         </div>
//                                         <div className="space-y-2">
//                                             <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
//                                                 <Label>Node Size</Label>
//                                                 <span>{vizParams.nodeSize}</span>
//                                             </div>
//                                             <Slider
//                                                 value={[vizParams.nodeSize]}
//                                                 min={5}
//                                                 max={40}
//                                                 step={1}
//                                                 onValueChange={(v) => setVizParams((p) => ({ ...p, nodeSize: v[0] }))}
//                                             />
//                                         </div>
//                                     </div>
//                                 )}
//                             </div>
//                         </div>
//                     </ScrollArea>
//                     {/* NEW FOOTER FOR NAVIGATION */}
//                     <div className="p-4 border-t border-slate-200 bg-slate-50/50">
//                         <Button
//                             variant="outline"
//                             className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
//                             onClick={() => navigate('/data/pipeline/explore')}
//                         >
//                             <ArrowLeft className="w-4 h-4" />
//                             Back to Pipeline
//                         </Button>
//                     </div>
//                 </aside>
//                 {/* MAIN CONTENT AREA */}
//                 <main className="flex-1 flex flex-col relative bg-slate-50/30 min-h-0 min-w-0">
//                     {/* Header Toolbar */}
//                     <header className="h-14 border-b border-slate-200 flex items-center justify-end px-6 bg-white shadow-sm z-20 shrink-0">
//                         <div className="flex items-center gap-2">
//                             <Tooltip>
//                                 <TooltipTrigger
//                                     className={`${buttonVariants({ variant: 'ghost', size: 'icon' })} h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg`}
//                                     onClick={() => (window as any).fitToScreen?.()}
//                                 >
//                                     <Maximize2 className="w-4 h-4" />
//                                 </TooltipTrigger>
//                                 <TooltipContent>Fit to Screen</TooltipContent>
//                             </Tooltip>
//                         </div>
//                     </header>
//                     {/* Canvas Area */}
//                     <div className="flex-1 p-6 overflow-hidden min-h-0 min-w-0 relative">
//                         <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden relative">
//                             <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-slate-200 pointer-events-none">
//                                 <h2 className="text-sm font-bold text-slate-800">
//                                     {filteredData.name || 'OCPN Model'}
//                                 </h2>
//                                 <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
//                                     {filteredData.places.length} Places • {filteredData.transitions.length} Transitions
//                                 </p>
//                             </div>
//                             <ReactFlowProvider>
//                                 <div className="absolute inset-0">
//                                     <ViewerCore data={filteredData} params={vizParams} />
//                                 </div>
//                             </ReactFlowProvider>
//                         </div>
//                     </div>
//                 </main>
//             </div>
//         </TooltipProvider>
//     );
// }
// import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import { useQuery } from '@tanstack/react-query';
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
// import { Activity, ArrowLeft, ChevronDown, ChevronRight, Database, Maximize2, Settings } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// // Store
// import { useExploreFlowStore } from '~/stores/exploreStore';
// // Miner Nodes & Types
// import { ArcEdge, PlaceNode, TransitionNode } from '../components/explore/miner/OcpnMinerNode.tsx';
// // UI Components
// import { Button, buttonVariants } from '../components/ui/button';
// import { Label } from '../components/ui/label';
// import { ScrollArea } from '../components/ui/scroll-area';
// import { Separator } from '../components/ui/separator';
// import { Slider } from '../components/ui/slider';
// import { Switch } from '../components/ui/switch';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
// import { RustOcpnData } from '../types/ocpn.types';
// // Types & Config
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
// const ViewerCore = ({
//     data,
//     params,
//     colorMap,
// }: {
//     data: RustOcpnData;
//     params: VizParams;
//     colorMap: Record<string, string>;
// }) => {
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
//     // Read colors strictly from the map provided by the File Node
//     const getColor = useCallback(
//         (type: string) => {
//             return colorMap[type] || '#64748b'; // Fallback to gray if not found
//         },
//         [colorMap]
//     );
//     // Initial Physics Setup
//     useEffect(() => {
//         if (!data || !data.places) return;
//         physicsNodesRef.current = [
//             ...data.places.map((p) => ({ ...p, type: 'place', x: Math.random() * 800, y: Math.random() * 600 })),
//             ...data.transitions.map((t) => ({
//                 ...t,
//                 type: 'transition',
//                 x: Math.random() * 800,
//                 y: Math.random() * 600,
//             })),
//         ];
//         physicsLinksRef.current = data.arcs.map((arc) => {
//             const connectedPlace = data.places.find((p) => p.id === arc.source.id || p.id === arc.target.id);
//             return {
//                 id: arc.id,
//                 source: arc.source.id,
//                 target: arc.target.id,
//                 variable: arc.variable,
//                 objectType: connectedPlace ? connectedPlace.object_type : 'default',
//             };
//         });
//         if (simulationRef.current) simulationRef.current.stop();
//         const sim = forceSimulation(physicsNodesRef.current)
//             .force(
//                 'link',
//                 forceLink(physicsLinksRef.current)
//                     .id((d: any) => d.id)
//                     .distance(paramsRef.current.linkDistance)
//             )
//             .force('charge', forceManyBody().strength(paramsRef.current.chargeStrength))
//             .force('center', forceCenter(400, 300))
//             .force('collision', forceCollide().radius(paramsRef.current.collisionRadius));
//         sim.on('tick', () => {
//             const flowNodes = physicsNodesRef.current.map((n: any) => ({
//                 id: n.id,
//                 type: n.type,
//                 position: { x: n.x - paramsRef.current.nodeSize, y: n.y - paramsRef.current.nodeSize },
//                 data: {
//                     label: n.name || n.label || '',
//                     objectType: n.object_type,
//                     color: n.object_type ? getColor(n.object_type) : '#64748b',
//                     size: paramsRef.current.nodeSize,
//                     labelSize: paramsRef.current.labelSize,
//                     initial: n.initial,
//                     final: n.final,
//                     silent: n.silent,
//                 },
//             }));
//             const flowEdges = physicsLinksRef.current.map((l: any) => ({
//                 id: l.id,
//                 source: l.source.id || l.source,
//                 target: l.target.id || l.target,
//                 type: 'arc',
//                 data: {
//                     color: l.objectType !== 'default' ? getColor(l.objectType) : '#94a3b8',
//                     curvature: 1.2, // Fixed default curvature
//                     variable: l.variable,
//                 },
//                 markerEnd: {
//                     type: MarkerType.ArrowClosed,
//                     color: l.objectType !== 'default' ? getColor(l.objectType) : '#94a3b8',
//                 },
//             }));
//             setNodes(flowNodes);
//             setEdges(flowEdges);
//         });
//         simulationRef.current = sim;
//         setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 500);
//         return () => sim.stop();
//     }, [data, getColor, setNodes, setEdges, fitView]);
//     // Dynamic Parameter Updates (Sliders)
//     useEffect(() => {
//         if (!simulationRef.current) return;
//         const sim = simulationRef.current;
//         (sim.force('link') as any).distance(params.linkDistance);
//         (sim.force('charge') as any).strength(params.chargeStrength);
//         (sim.force('collision') as any).radius(params.collisionRadius);
//         sim.alpha(0.3).restart();
//     }, [params.linkDistance, params.chargeStrength, params.collisionRadius]);
//     return (
//         <ReactFlow
//             nodes={nodes}
//             edges={edges}
//             onNodesChange={onNodesChange}
//             onEdgesChange={onEdgesChange}
//             nodeTypes={nodeTypes}
//             edgeTypes={edgeTypes}
//             fitViewOptions={{ padding: 0.2 }}
//         >
//             <Background gap={20} color="#f1f5f9" />
//         </ReactFlow>
//     );
// };
// // ==========================================
// // 2. MAIN LAYOUT (SIDEBAR + CANVAS)
// // ==========================================
// export default function OcpnViewer({ nodeId }: { nodeId?: string }) {
//     const navigate = useNavigate();
//     const [isExiting, setIsExiting] = useState(false);
//     // 1. Fetch Node Data from Store to get the color map generated by the File Node
//     const getNode = useExploreFlowStore((state) => state.getNode);
//     const fileNodeData = nodeId ? (getNode(nodeId)?.data as any) : null;
//     const colorMap = fileNodeData?.objectTypeColors || {};
//     // 2. Fetch Backend Data
//     const { data: rawData, isLoading: isFetchingData } = useQuery({
//         queryKey: ['getOcpnData', nodeId],
//         queryFn: async () => {
//             // Adjust this URL based on how your frontend usually calls the backend API!
//             const response = await fetch(`/v1/ocpn/from_ocpt/${nodeId}`);
//             if (!response.ok) throw new Error('Failed to fetch OCPN data');
//             return response.json() as Promise<RustOcpnData>;
//         },
//         enabled: !!nodeId,
//     });
//     // UI State
//     const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['objects', 'styling']));
//     const [vizParams, setVizParams] = useState<VizParams>({
//         linkDistance: 120,
//         chargeStrength: -400,
//         collisionRadius: 45,
//         nodeSize: 18,
//         labelSize: 11,
//     });
//     // Object Types State
//     const allObjectTypes = useMemo(
//         () => Array.from(new Set(rawData?.places?.map((p) => p.object_type) || [])),
//         [rawData]
//     );
//     const [visibleObjectTypes, setVisibleObjectTypes] = useState<Set<string>>(new Set());
//     // Ensure state initializes once data loads
//     useEffect(() => {
//         if (allObjectTypes.length > 0 && visibleObjectTypes.size === 0) {
//             setVisibleObjectTypes(new Set(allObjectTypes));
//         }
//     }, [allObjectTypes]);
//     // Filter data based on toggles
//     const filteredData = useMemo(() => {
//         if (!rawData || !rawData.places) return null;
//         const places = rawData.places.filter((p) => visibleObjectTypes.has(p.object_type));
//         const placeIds = new Set(places.map((p) => p.id));
//         // Keep arcs that connect to at least one visible place
//         const arcs = rawData.arcs.filter((a) => placeIds.has(a.source.id) || placeIds.has(a.target.id));
//         // Keep transitions connected to remaining arcs
//         const connectedNodeIds = new Set();
//         arcs.forEach((a) => {
//             connectedNodeIds.add(a.source.id);
//             connectedNodeIds.add(a.target.id);
//         });
//         const transitions = rawData.transitions.filter((t) => connectedNodeIds.has(t.id));
//         return { ...rawData, places, arcs, transitions };
//     }, [rawData, visibleObjectTypes]);
//     const toggleSection = (id: string) => {
//         const next = new Set(expandedSections);
//         if (next.has(id)) next.delete(id);
//         else next.add(id);
//         setExpandedSections(next);
//     };
//     const toggleObjectType = (type: string) => {
//         const next = new Set(visibleObjectTypes);
//         if (next.has(type)) next.delete(type);
//         else next.add(type);
//         setVisibleObjectTypes(next);
//     };
//     const handleBackToPipeline = () => {
//         setIsExiting(true);
//         setTimeout(() => navigate('/data/pipeline/explore'), 50);
//     };
//     // Global Loading State
//     if (isFetchingData || !filteredData) {
//         return (
//             <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-slate-50 text-slate-500 font-medium">
//                 <Activity className="w-8 h-8 text-blue-500 animate-spin" />
//                 <p className="text-sm font-semibold text-slate-500 tracking-wide">Fetching Model Data...</p>
//             </div>
//         );
//     }
//     return (
//         <TooltipProvider>
//             <div className="flex absolute inset-0 w-full h-full bg-white text-slate-900 font-sans overflow-hidden">
//                 {/* SIDEBAR */}
//                 <aside className="w-72 border-r border-slate-200 flex flex-col bg-white z-10 shadow-sm shrink-0">
//                     <div className="p-5 border-b border-slate-100 bg-slate-50/50">
//                         <div className="flex items-center gap-2">
//                             <Activity className="w-5 h-5 text-blue-600" />
//                             <h1 className="text-lg font-bold tracking-tight text-slate-800">OCPN Visualizer</h1>
//                         </div>
//                     </div>
//                     <ScrollArea className="flex-1 min-h-0">
//                         <div className="p-4 space-y-1">
//                             {/* Object Perspectives */}
//                             <div className="space-y-1">
//                                 <button
//                                     onClick={() => toggleSection('objects')}
//                                     className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md transition-colors group"
//                                 >
//                                     <div className="flex items-center gap-2">
//                                         <Database className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
//                                         <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
//                                             Object Perspectives
//                                         </span>
//                                     </div>
//                                     {expandedSections.has('objects') ? (
//                                         <ChevronDown className="w-3 h-3 text-slate-400" />
//                                     ) : (
//                                         <ChevronRight className="w-3 h-3 text-slate-400" />
//                                     )}
//                                 </button>
//                                 {expandedSections.has('objects') && (
//                                     <div className="overflow-hidden pl-4 space-y-1 mt-1">
//                                         {allObjectTypes.map((type) => (
//                                             <div
//                                                 key={type}
//                                                 className="flex items-center justify-between p-2 hover:bg-slate-50/50 rounded-md"
//                                             >
//                                                 <Label
//                                                     htmlFor={`toggle-${type}`}
//                                                     className="text-xs text-slate-600 capitalize cursor-pointer flex-1 flex items-center gap-2"
//                                                 >
//                                                     <div
//                                                         className="w-2 h-2 rounded-full"
//                                                         style={{ backgroundColor: colorMap[type] || '#64748b' }}
//                                                     />
//                                                     {type}
//                                                 </Label>
//                                                 <Switch
//                                                     id={`toggle-${type}`}
//                                                     checked={visibleObjectTypes.has(type)}
//                                                     onCheckedChange={() => toggleObjectType(type)}
//                                                     className="scale-75"
//                                                 />
//                                             </div>
//                                         ))}
//                                     </div>
//                                 )}
//                             </div>
//                             <Separator className="my-2 bg-slate-100" />
//                             {/* Styling Configurations */}
//                             <div className="space-y-1">
//                                 <button
//                                     onClick={() => toggleSection('styling')}
//                                     className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md transition-colors group"
//                                 >
//                                     <div className="flex items-center gap-2">
//                                         <Settings className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
//                                         <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
//                                             Styling
//                                         </span>
//                                     </div>
//                                     {expandedSections.has('styling') ? (
//                                         <ChevronDown className="w-3 h-3 text-slate-400" />
//                                     ) : (
//                                         <ChevronRight className="w-3 h-3 text-slate-400" />
//                                     )}
//                                 </button>
//                                 {expandedSections.has('styling') && (
//                                     <div className="overflow-hidden pl-4 pr-2 py-3 space-y-5">
//                                         <div className="space-y-2">
//                                             <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
//                                                 <Label>Link Distance</Label>
//                                                 <span>{vizParams.linkDistance}</span>
//                                             </div>
//                                             <Slider
//                                                 value={[vizParams.linkDistance]}
//                                                 min={50}
//                                                 max={300}
//                                                 step={10}
//                                                 onValueChange={(v) =>
//                                                     setVizParams((p) => ({ ...p, linkDistance: v[0] }))
//                                                 }
//                                             />
//                                         </div>
//                                         <div className="space-y-2">
//                                             <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
//                                                 <Label>Repulsion</Label>
//                                                 <span>{Math.abs(vizParams.chargeStrength)}</span>
//                                             </div>
//                                             <Slider
//                                                 value={[Math.abs(vizParams.chargeStrength)]}
//                                                 min={100}
//                                                 max={1000}
//                                                 step={50}
//                                                 onValueChange={(v) =>
//                                                     setVizParams((p) => ({ ...p, chargeStrength: -v[0] }))
//                                                 }
//                                             />
//                                         </div>
//                                         <div className="space-y-2">
//                                             <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
//                                                 <Label>Node Size</Label>
//                                                 <span>{vizParams.nodeSize}</span>
//                                             </div>
//                                             <Slider
//                                                 value={[vizParams.nodeSize]}
//                                                 min={5}
//                                                 max={40}
//                                                 step={1}
//                                                 onValueChange={(v) => setVizParams((p) => ({ ...p, nodeSize: v[0] }))}
//                                             />
//                                         </div>
//                                     </div>
//                                 )}
//                             </div>
//                         </div>
//                     </ScrollArea>
//                     {/* FOOTER FOR NAVIGATION */}
//                     <div className="p-4 border-t border-slate-200 bg-slate-50/50">
//                         <Button
//                             variant="outline"
//                             className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
//                             onClick={handleBackToPipeline}
//                             disabled={isExiting}
//                         >
//                             {isExiting ? (
//                                 <>
//                                     <Activity className="w-4 h-4 animate-spin text-blue-500" />
//                                     Returning...
//                                 </>
//                             ) : (
//                                 <>
//                                     <ArrowLeft className="w-4 h-4" />
//                                     Back to Pipeline
//                                 </>
//                             )}
//                         </Button>
//                     </div>
//                 </aside>
//                 {/* MAIN CONTENT AREA */}
//                 <main className="flex-1 flex flex-col relative bg-slate-50/30 min-h-0 min-w-0">
//                     <header className="h-14 border-b border-slate-200 flex items-center justify-end px-6 bg-white shadow-sm z-20 shrink-0">
//                         <div className="flex items-center gap-2">
//                             <Tooltip>
//                                 <TooltipTrigger
//                                     className={`${buttonVariants({ variant: 'ghost', size: 'icon' })} h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg`}
//                                     onClick={() => (window as any).fitToScreen?.()}
//                                 >
//                                     <Maximize2 className="w-4 h-4" />
//                                 </TooltipTrigger>
//                                 <TooltipContent>Fit to Screen</TooltipContent>
//                             </Tooltip>
//                         </div>
//                     </header>
//                     {/* Canvas Area */}
//                     <div className="flex-1 p-6 overflow-hidden min-h-0 min-w-0 relative">
//                         <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden relative">
//                             <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-slate-200 pointer-events-none">
//                                 <h2 className="text-sm font-bold text-slate-800">
//                                     {filteredData.name || 'OCPN Model'}
//                                 </h2>
//                                 <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
//                                     {filteredData.places.length} Places • {filteredData.transitions.length} Transitions
//                                 </p>
//                             </div>
//                             {/* Conditionally unmount flow to prevent lag on routing back */}
//                             {isExiting ? (
//                                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-50">
//                                     <Activity className="w-8 h-8 text-blue-500 animate-spin mb-4" />
//                                     <p className="text-sm font-semibold text-slate-600 tracking-wide">
//                                         Loading Pipeline...
//                                     </p>
//                                 </div>
//                             ) : (
//                                 <ReactFlowProvider>
//                                     <div className="absolute inset-0">
//                                         <ViewerCore data={filteredData} params={vizParams} colorMap={colorMap} />
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
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    Database,
    Maximize2,
    Settings,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { getDeterministicColor } from '~/lib/colors';
import { FileExploreNodeData } from '~/types/explore/nodeData/fileNodeData';
import { ArcEdge, PlaceNode, TransitionNode } from '../components/explore/miner/OcpnMinerNode.tsx';
import { Button, buttonVariants } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { RustOcpnData } from '../types/ocpn.types';

export interface VizParams {
    linkDistance: number;
    chargeStrength: number;
    collisionRadius: number;
    nodeSize: number;
    labelSize: number;
}
const nodeTypes = { place: PlaceNode, transition: TransitionNode };
const edgeTypes = { arc: ArcEdge };

const ViewerCore = ({
    data,
    params,
    colorMap,
}: {
    data: RustOcpnData;
    params: VizParams;
    colorMap: Record<string, string>;
}) => {
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

    const getColor = useCallback(
        (type: string) => {
            return colorMap[type] || getDeterministicColor(type);
        },
        [colorMap]
    );

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
            setNodes(
                physicsNodesRef.current.map((n: any) => ({
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
                }))
            );
            setEdges(
                physicsLinksRef.current.map((l: any) => ({
                    id: l.id,
                    source: l.source.id || l.source,
                    target: l.target.id || l.target,
                    type: 'arc',
                    data: {
                        color: l.objectType !== 'default' ? getColor(l.objectType) : '#94a3b8',
                        curvature: 1.2,
                        variable: l.variable,
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: l.objectType !== 'default' ? getColor(l.objectType) : '#94a3b8',
                    },
                }))
            );
        });

        simulationRef.current = sim;
        setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 500);
        return () => sim.stop();
    }, [data, getColor, setNodes, setEdges, fitView]);

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

export default function OcpnViewer({ nodeId: propNodeId }: { nodeId?: string }) {
    const navigate = useNavigate();
    const params = useParams<{ nodeId: string }>();
    const nodeId = propNodeId || params.nodeId;
    const [isExiting, setIsExiting] = useState(false);

    // 1. EXTRACT DATA DIRECTLY FROM THE STORE
    const { getNode } = useExploreFlowStore();
    const node = nodeId ? getNode(nodeId) : undefined;
    const nodeData = node?.data as FileExploreNodeData | undefined;

    const rawData = (nodeData?.processedData as RustOcpnData) || null;
    const colorMap = (nodeData?.colorMap as Record<string, string>) || {};

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['objects', 'styling']));
    const [vizParams, setVizParams] = useState<VizParams>({
        linkDistance: 120,
        chargeStrength: -400,
        collisionRadius: 45,
        nodeSize: 18,
        labelSize: 11,
    });

    const allObjectTypes = useMemo(
        () => Array.from(new Set(rawData?.places?.map((p) => p.object_type) || [])),
        [rawData]
    );
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
        const arcs = rawData.arcs.filter((a) => placeIds.has(a.source.id) || placeIds.has(a.target.id));
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

    const handleBackToPipeline = () => {
        setIsExiting(true);
        setTimeout(() => navigate('/data/pipeline/explore'), 50);
    };

    // FIX FOR BLANK SCREEN: Explicitly show why it is blank!
    if (!rawData || !rawData.places) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-slate-50 text-slate-500 font-medium">
                <AlertTriangle className="w-10 h-10 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-700">Incomplete Data</h2>
                <p className="text-sm text-slate-500 max-w-md text-center">
                    The backend payload is missing or not formatted correctly. Ensure `processedData` contains `places`
                    and `transitions`.
                </p>
                <Button variant="outline" onClick={handleBackToPipeline}>
                    Return to Pipeline
                </Button>
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
                                        {allObjectTypes.map((type) => {
                                            const objColor = colorMap?.[type] || getDeterministicColor(type);
                                            return (
                                                <div
                                                    key={type}
                                                    className="flex items-center justify-between p-2 hover:bg-slate-50/50 rounded-md"
                                                >
                                                    <Label
                                                        htmlFor={`toggle-${type}`}
                                                        className="text-xs text-slate-600 capitalize cursor-pointer flex-1 flex items-center gap-2"
                                                    >
                                                        <div
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: objColor }}
                                                        />
                                                        {type}
                                                    </Label>
                                                    <Switch
                                                        id={`toggle-${type}`}
                                                        checked={visibleObjectTypes.has(type)}
                                                        onCheckedChange={() => toggleObjectType(type)}
                                                        className="scale-75"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <Separator className="my-2 bg-slate-100" />
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
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                        <Button
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                            onClick={handleBackToPipeline}
                            disabled={isExiting}
                        >
                            {isExiting ? (
                                <>
                                    <Activity className="w-4 h-4 animate-spin text-blue-500" />
                                    Returning...
                                </>
                            ) : (
                                <>
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Pipeline
                                </>
                            )}
                        </Button>
                    </div>
                </aside>
                <main className="flex-1 flex flex-col relative bg-slate-50/30 min-h-0 min-w-0">
                    <header className="h-14 border-b border-slate-200 flex items-center justify-end px-6 bg-white shadow-sm z-20 shrink-0">
                        <Tooltip>
                            <TooltipTrigger
                                className={`${buttonVariants({ variant: 'ghost', size: 'icon' })} h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg`}
                                onClick={() => (window as any).fitToScreen?.()}
                            >
                                <Maximize2 className="w-4 h-4" />
                            </TooltipTrigger>
                            <TooltipContent>Fit to Screen</TooltipContent>
                        </Tooltip>
                    </header>
                    <div className="flex-1 p-6 overflow-hidden min-h-0 min-w-0 relative">
                        <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden relative">
                            {isExiting ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-50">
                                    <Activity className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                                    <p className="text-sm font-semibold text-slate-600 tracking-wide">
                                        Loading Pipeline...
                                    </p>
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
