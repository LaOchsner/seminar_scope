// import { useEffect, useRef, useState } from 'react';
// import * as d3 from 'd3';
// import { Checkbox } from '~/components/ui/checkbox';
// import { useGetOcel } from '~/services/queries';
// type NodeDatum = {
//     id: string;
//     label: string;
//     type: 'event' | 'object';
//     x?: number;
//     y?: number;
//     fx?: number | null;
//     fy?: number | null;
// };
// type EdgeDatum = {
//     id: string;
//     source: NodeDatum;
//     target: NodeDatum;
//     label: string;
// };
// const MAX_CHUNK = 5;
// const NODE_RADIUS = 20;
// const NODE_GAP = 50;
// interface OcelVisualizationD3Props {
//     fileId: string;
// }
// const OcelVisualization: React.FC<OcelVisualizationD3Props> = ({ fileId }) => {
//     const { data, isLoading, error } = useGetOcel(fileId);
//     const svgRef = useRef<SVGSVGElement | null>(null);
//     const eventsChartRef = useRef<SVGSVGElement | null>(null);
//     const objectsChartRef = useRef<SVGSVGElement | null>(null);
//     const [chunk, setChunk] = useState(1);
//     const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
//     const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
//     const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: NodeDatum } | null>(null);
//     const nodesRef = useRef<NodeDatum[]>([]);
//     const edgesRef = useRef<EdgeDatum[]>([]);
//     const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
//     const zoomTransformRef = useRef<d3.ZoomTransform | null>(null);
//     // Utility: Get all connected node IDs using BFS
//     const getConnectedNodes = (startId: string): Set<string> => {
//         const visited = new Set<string>();
//         const queue = [startId];
//         visited.add(startId);
//         while (queue.length > 0) {
//             const current = queue.shift()!;
//             const connectedEdges = edgesRef.current.filter((e) => e.source.id === current || e.target.id === current);
//             connectedEdges.forEach((edge) => {
//                 const neighbor = edge.source.id === current ? edge.target.id : edge.source.id;
//                 if (!visited.has(neighbor)) {
//                     visited.add(neighbor);
//                     queue.push(neighbor);
//                 }
//             });
//         }
//         return visited;
//     };
//     useEffect(() => {
//         if (!data || !svgRef.current) return;
//         const svg = d3.select(svgRef.current);
//         const width = svgRef.current.clientWidth;
//         const height = svgRef.current.clientHeight;
//         svg.selectAll('*').remove();
//         const g = svg.append('g');
//         // Zoom support
//         const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
//             g.attr('transform', event.transform.toString());
//             zoomTransformRef.current = event.transform;
//         });
//         svg.call(zoom as any);
//         if (zoomTransformRef.current) svg.call(zoom.transform as any, zoomTransformRef.current);
//         const events = data.events || [];
//         const objects = data.objects || [];
//         const filteredEvents = events.filter(
//             (evt: any) => selectedTypes.length === 0 || selectedTypes.includes(evt.type)
//         );
//         const chunkedEvents = filteredEvents.slice(0, chunk * MAX_CHUNK);
//         // Create event nodes
//         const eventNodes: NodeDatum[] = chunkedEvents.map((evt: any) => ({
//             id: evt.id.toString(),
//             label: evt.type || evt.activity || 'Event',
//             type: 'event',
//         }));
//         // Create object nodes
//         const objectIds = new Set<string>();
//         chunkedEvents.forEach((evt: any) =>
//             (evt.relationships || []).forEach((rel: any) => objectIds.add(rel.objectId))
//         );
//         const objectNodes: NodeDatum[] = Array.from(objectIds).map((objId) => ({
//             id: objId.toString(),
//             label: objects[objId]?.type || objId,
//             type: 'object',
//         }));
//         nodesRef.current = [...eventNodes, ...objectNodes];
//         // Create edges
//         edgesRef.current = chunkedEvents.flatMap((evt: any) =>
//             (evt.relationships || []).map((rel: any, j: number) => ({
//                 id: `${evt.id}-${rel.objectId}-${j}`,
//                 source: nodesRef.current.find((n) => n.id === evt.id.toString())!,
//                 target: nodesRef.current.find((n) => n.id === rel.objectId.toString())!,
//                 label: rel.qualifier || '',
//             }))
//         );
//         // Position nodes
//         nodesRef.current.forEach((n) => {
//             const saved = positionsRef.current.get(n.id);
//             if (saved) {
//                 n.x = saved.x;
//                 n.y = saved.y;
//             } else {
//                 let newX, newY, overlapping;
//                 do {
//                     newX = width / 2 + Math.random() * 400 - 200;
//                     newY = height / 2 + Math.random() * 400 - 200;
//                     overlapping = Array.from(positionsRef.current.values()).some(
//                         (p) => Math.hypot(p.x - newX, p.y - newY) < NODE_GAP
//                     );
//                 } while (overlapping);
//                 n.x = newX;
//                 n.y = newY;
//                 positionsRef.current.set(n.id, { x: n.x, y: n.y });
//             }
//         });
//         // Draw edges
//         g.selectAll('line')
//             .data(edgesRef.current)
//             .enter()
//             .append('line')
//             .attr('stroke', (d) =>
//                 collapsedNodes.has(d.source.id) || collapsedNodes.has(d.target.id) ? '#b0b0b0' : 'black'
//             )
//             .attr('stroke-width', 1.8)
//             .attr('x1', (d) => positionsRef.current.get(d.source.id)?.x || 0)
//             .attr('y1', (d) => positionsRef.current.get(d.source.id)?.y || 0)
//             .attr('x2', (d) => positionsRef.current.get(d.target.id)?.x || 0)
//             .attr('y2', (d) => positionsRef.current.get(d.target.id)?.y || 0);
//         // Draw nodes
//         const nodeGroup = g
//             .selectAll<SVGGElement, NodeDatum>('g.node')
//             .data(nodesRef.current)
//             .enter()
//             .append('g')
//             .attr('class', 'node')
//             .attr('transform', (d) => `translate(${d.x},${d.y})`)
//             .call(d3.drag<SVGGElement, NodeDatum>().on('start', dragstarted).on('drag', dragged).on('end', dragended));
//         nodeGroup
//             .append('circle')
//             .attr('r', NODE_RADIUS)
//             .attr('fill', (d) => {
//                 if (collapsedNodes.has(d.id)) return 'lightgray';
//                 return d.type === 'event' ? 'orange' : 'steelblue';
//             })
//             .attr('stroke', '#fff')
//             .attr('stroke-width', 1.5)
//             .style('cursor', 'pointer')
//             .on('click', (event, d) => {
//                 event.stopPropagation();
//                 const [x, y] = d3.pointer(event, svgRef.current);
//                 setContextMenu({ x, y, node: d });
//             });
//         // Labels
//         nodeGroup.each(function (d) {
//             const group = d3.select(this);
//             const words = d.label.split(/[\s_]+|(?=[A-Z])/g);
//             const lineHeight = 8;
//             const maxLines = 3;
//             const wrapped: string[] = [];
//             let line = '';
//             words.forEach((w) => {
//                 if ((line + ' ' + w).length < 10) line += ' ' + w;
//                 else {
//                     wrapped.push(line.trim());
//                     line = w;
//                 }
//             });
//             wrapped.push(line.trim());
//             const finalLines = wrapped.length > maxLines ? [...wrapped.slice(0, maxLines - 1), '...'] : wrapped;
//             const text = group
//                 .append('text')
//                 .attr('text-anchor', 'middle')
//                 .attr('alignment-baseline', 'middle')
//                 .attr('font-size', 8)
//                 .attr('font-weight', '600')
//                 .attr('fill', 'white')
//                 .attr('pointer-events', 'none');
//             const offset = (finalLines.length - 1) * -lineHeight * 0.5;
//             text.selectAll('tspan')
//                 .data(finalLines)
//                 .enter()
//                 .append('tspan')
//                 .attr('x', 0)
//                 .attr('y', (_, i) => offset + i * lineHeight)
//                 .text((t) => t);
//         });
//         // Drag behavior
//         function dragstarted(event: any, d: any) {
//             d.fx = d.x;
//             d.fy = d.y;
//         }
//         function dragged(event: any, d: any) {
//             d.x = event.x;
//             d.y = event.y;
//             positionsRef.current.set(d.id, { x: d.x, y: d.y });
//             d3.select(this).attr('transform', `translate(${d.x},${d.y})`);
//             g.selectAll('line')
//                 .attr('x1', (d: any) => positionsRef.current.get(d.source.id)?.x || 0)
//                 .attr('y1', (d: any) => positionsRef.current.get(d.source.id)?.y || 0)
//                 .attr('x2', (d: any) => positionsRef.current.get(d.target.id)?.x || 0)
//                 .attr('y2', (d: any) => positionsRef.current.get(d.target.id)?.y || 0);
//         }
//         function dragended(event: any, d: any) {
//             d.fx = null;
//             d.fy = null;
//             positionsRef.current.set(d.id, { x: d.x!, y: d.y! });
//         }
//     }, [data, chunk, selectedTypes, collapsedNodes]);
//     const getNodeEdges = (nodeId: string) => {
//         return edgesRef.current.filter((e) => e.source.id === nodeId || e.target.id === nodeId);
//     };
//     // Helper: get connected nodes (only immediate neighbors)
//     const getImmediateNeighbors = (nodeId: string): NodeDatum[] => {
//         return edgesRef.current
//             .filter((e) => e.source.id === nodeId || e.target.id === nodeId)
//             .map((e) => (e.source.id === nodeId ? e.target : e.source));
//     };
//     const handleCollapse = (nodeId: string) => {
//         const node = nodesRef.current.find((n) => n.id === nodeId);
//         if (!node) return;
//         const newCollapsed = new Set(collapsedNodes);
//         if (node.type === 'event') {
//             // Collapse the event node
//             newCollapsed.add(node.id);
//             // Collapse connected object nodes only if they have no other event connections
//             const connectedObjects = getImmediateNeighbors(node.id).filter((n) => n.type === 'object');
//             connectedObjects.forEach((obj) => {
//                 const objectEdges = getNodeEdges(obj.id);
//                 const connectedEvents = objectEdges
//                     .map((e) => (e.source.id === obj.id ? e.target : e.source))
//                     .filter((n) => n.type === 'event' && n.id !== node.id);
//                 // If object node has no other event connections, collapse it too
//                 if (connectedEvents.length === 0) {
//                     newCollapsed.add(obj.id);
//                 }
//             });
//         } else if (node.type === 'object') {
//             // Collapse the object node only if its connected event nodes
//             // have connections to other nodes (so collapsing won’t isolate them)
//             const connectedEvents = getImmediateNeighbors(node.id).filter((n) => n.type === 'event');
//             let canCollapse = true;
//             connectedEvents.forEach((evt) => {
//                 const evtEdges = getNodeEdges(evt.id);
//                 const otherConnections = evtEdges.filter((e) => e.source.id !== node.id && e.target.id !== node.id);
//                 // If the event has no other connections, do not collapse object
//                 if (otherConnections.length === 0) {
//                     canCollapse = false;
//                 }
//             });
//             if (canCollapse) newCollapsed.add(node.id);
//         }
//         setCollapsedNodes(newCollapsed);
//         setContextMenu(null);
//     };
//     const handleExpand = (nodeId: string) => {
//     const node = nodesRef.current.find(n => n.id === nodeId);
//     if (!node) return;
//     setCollapsedNodes(prev => {
//       const newSet = new Set(prev);
//       // Remove the node itself
//       newSet.delete(nodeId);
//       // Remove immediate neighbors only if they are collapsed
//       getImmediateNeighbors(nodeId).forEach(n => {
//         if (newSet.has(n.id)) newSet.delete(n.id);
//       });
//       return newSet;
//     });
//     setContextMenu(null);
//   };
//   const toggleType = (type: string) => {
//     setChunk(5);
//     setSelectedTypes(prev =>
//       prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
//     );
//   };
//     useEffect(() => {
//         if (!data) return;
//         const tooltip = d3
//             .select('body')
//             .append('div')
//             .attr('class', 'd3-tooltip')
//             .style('position', 'absolute')
//             .style('background', 'rgba(0,0,0,0.7)')
//             .style('color', 'white')
//             .style('padding', '6px 10px')
//             .style('border-radius', '6px')
//             .style('font-size', '12px')
//             .style('pointer-events', 'none')
//             .style('opacity', 0);
//         const createHistogram = (ref: SVGSVGElement, dataArr: [string, number][], fillColor: string) => {
//             const svg = d3.select(ref);
//             svg.selectAll('*').remove();
//             const width = svg.node()?.clientWidth || 250;
//             const height = svg.node()?.clientHeight || 200;
//             const margin = { top: 20, right: 20, bottom: 50, left: 40 };
//             const x = d3
//                 .scaleBand()
//                 .domain(dataArr.map(([k]) => k))
//                 .range([margin.left, width - margin.right])
//                 .padding(0.2);
//             const y = d3
//                 .scaleLinear()
//                 .domain([0, d3.max(dataArr, ([, v]) => v)!])
//                 .nice()
//                 .range([height - margin.bottom, margin.top]);
//             svg.append('g')
//                 .selectAll('rect')
//                 .data(dataArr)
//                 .enter()
//                 .append('rect')
//                 .attr('x', ([k]) => x(k)!)
//                 .attr('y', ([, v]) => y(v))
//                 .attr('width', x.bandwidth())
//                 .attr('height', ([, v]) => y(0) - y(v))
//                 .attr('fill', fillColor)
//                 .on('mouseover', (event, [, v]) => {
//                     tooltip.style('opacity', 1).html(`<strong>Count:</strong> ${v}`);
//                 })
//                 .on('mousemove', (event) => {
//                     tooltip.style('left', event.pageX + 10 + 'px').style('top', event.pageY - 20 + 'px');
//                 })
//                 .on('mouseout', () => {
//                     tooltip.style('opacity', 0);
//                 });
//             svg.append('g')
//                 .attr('transform', `translate(0,${height - margin.bottom})`)
//                 .call(d3.axisBottom(x))
//                 .selectAll('text')
//                 .attr('transform', 'rotate(-35)')
//                 .style('text-anchor', 'end')
//                 .attr('font-size', 9);
//             svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y));
//         };
//         const activityCounts = d3.rollups(
//             data.events || [],
//             (v) => v.length,
//             (d) => d.type || d.activity || 'Unknown'
//         );
//         const typeCounts = d3.rollups(
//             Object.values(data.objects || {}),
//             (v: any) => v.length,
//             (d: any) => d.type || 'Unknown'
//         );
//         if (eventsChartRef.current) createHistogram(eventsChartRef.current, activityCounts, 'orange');
//         if (objectsChartRef.current) createHistogram(objectsChartRef.current, typeCounts, 'steelblue');
//         return () => tooltip.remove();
//     }, [data]);
//     if (!fileId) return <p>No File selected</p>;
//     if (isLoading) return <p>Loading...</p>;
//     if (error) return <p>Error loading OCEL data</p>;
//     if (!data) return <p>No data available</p>;
//     return (
//         <div className="flex flex-col h-screen bg-gray-50 relative">
//             {contextMenu && (
//                 <div
//                     className="absolute bg-white border border-gray-300 shadow-lg rounded-md text-sm z-50"
//                     style={{ left: contextMenu.x + 20, top: contextMenu.y }}
//                 >
//                     <button
//                         className="block w-full text-left px-3 py-1 hover:bg-gray-100"
//                         onClick={() => handleCollapse(contextMenu.node.id)}
//                     >
//                         Collapse Connected
//                     </button>
//                     <button
//                         className="block w-full text-left px-3 py-1 hover:bg-gray-100"
//                         onClick={() => handleExpand(contextMenu.node.id)}
//                     >
//                         Expand Connected
//                     </button>
//                 </div>
//             )}
//             <div className="border-b border-gray-200 p-4 bg-white shadow-sm flex flex-wrap gap-3">
//                 <h2 className="font-bold text-gray-700">Filter by Event Type:</h2>
//                 {data.eventTypes?.map((type: any, idx: number) => {
//                     const typeName = typeof type === 'string' ? type : type.name;
//                     return (
//                         <div key={idx} className="flex items-center space-x-2">
//                             <Checkbox
//                                 id={`type-${idx}`}
//                                 checked={selectedTypes.includes(typeName)}
//                                 onCheckedChange={() => toggleType(typeName)}
//                             />
//                             <label htmlFor={`type-${idx}`} className="text-sm font-medium leading-none">
//                                 {typeName}
//                             </label>
//                         </div>
//                     );
//                 })}
//             </div>
//             <div className="grid grid-cols-4 gap-4 p-4 overflow-auto">
//                 <div className="col-span-3 bg-white rounded-xl shadow p-3 relative">
//                     <h3 className="font-semibold mb-2 text-center text-gray-700">Event–Object Relationship Graph</h3>
//                     <svg ref={svgRef} className="w-full h-[600px] border rounded-lg bg-gray-50" />
//                     {chunk * MAX_CHUNK < (data.events?.length || 0) && (
//                         <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
//                             <button
//                                 onClick={() => setChunk((prev) => prev + 1)}
//                                 className="px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600"
//                             >
//                                 Load More Events ({chunk * MAX_CHUNK}/{data.events.length})
//                             </button>
//                         </div>
//                     )}
//                 </div>
//                 <div className="col-span-1 flex flex-col gap-4">
//                     <div className="bg-white rounded-xl shadow p-3">
//                         <h3 className="font-semibold mb-2 text-center text-gray-700">Events per Activity</h3>
//                         <svg ref={eventsChartRef} className="w-full h-[250px]" />
//                     </div>
//                     <div className="bg-white rounded-xl shadow p-3">
//                         <h3 className="font-semibold mb-2 text-center text-gray-700">Objects per Type</h3>
//                         <svg ref={objectsChartRef} className="w-full h-[250px]" />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };
// export default OcelVisualization;


// import { useEffect, useRef, useState } from 'react';
// import * as d3 from 'd3';
// import { Checkbox } from '~/components/ui/checkbox';
// import { useGetOcel } from '~/services/queries';

// type NodeDatum = {
//   id: string;
//   label: string;
//   type: 'event' | 'object';
//   x?: number;
//   y?: number;
//   fx?: number | null;
//   fy?: number | null;
// };

// type EdgeDatum = {
//   id: string;
//   source: NodeDatum;
//   target: NodeDatum;
//   label: string;
// };

// const MAX_CHUNK = 10;

// interface OcelVisualizationD3Props {
//   fileId: string;
// }

// const OcelVisualization: React.FC<OcelVisualizationD3Props> = ({ fileId }) => {
//   const { data, isLoading, error } = useGetOcel(fileId);

//   const svgRef = useRef<SVGSVGElement | null>(null);
//   const eventsChartRef = useRef<SVGSVGElement | null>(null);
//   const objectsChartRef = useRef<SVGSVGElement | null>(null);

//   const [chunk, setChunk] = useState(1);
//   const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
//   const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());
//   const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: NodeDatum } | null>(null);

//   const nodesRef = useRef<NodeDatum[]>([]);
//   const edgesRef = useRef<EdgeDatum[]>([]);
//   const simulationRef = useRef<d3.Simulation<NodeDatum, undefined>>();

//   // --- Main Graph & Histograms Rendering ---
//   useEffect(() => {
//     if (!data || !svgRef.current) return;

//     const svg = d3.select(svgRef.current);
//     const width = svgRef.current.clientWidth;
//     const height = svgRef.current.clientHeight;

//     svg.selectAll('*').remove();
//     const g = svg.append('g');

//     // Zoom behavior
//     const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
//       g.attr('transform', event.transform.toString());
//     });
//     svg.call(zoom as any);

//     const events = data.events || [];
//     const objects = data.objects || [];

//     // Filter & chunk events
//     const filteredEvents = events.filter(
//       (evt: any) => selectedTypes.length === 0 || selectedTypes.includes(evt.type)
//     );
//     const chunkedEvents = filteredEvents.slice(0, chunk * MAX_CHUNK);

//     // --- Nodes ---
//     const eventNodes: NodeDatum[] = chunkedEvents.map((evt: any) => ({
//       id: evt.id.toString(),
//       label: evt.type || evt.activity || 'Event',
//       type: 'event',
//     }));

//     const objectIds = new Set<string>();
//     chunkedEvents.forEach((evt: any) =>
//       (evt.relationships || []).forEach((rel: any) => objectIds.add(rel.objectId))
//     );

//     const objectNodes: NodeDatum[] = Array.from(objectIds).map((objId) => ({
//       id: objId.toString(),
//       label: objects[objId]?.type || objId,
//       type: 'object',
//     }));

//     nodesRef.current = [...eventNodes, ...objectNodes];

//     edgesRef.current = chunkedEvents.flatMap((evt: any) =>
//       (evt.relationships || []).map((rel: any, j: number) => ({
//         id: `${evt.id}-${rel.objectId}-${j}`,
//         source: nodesRef.current.find((n) => n.id === evt.id.toString())!,
//         target: nodesRef.current.find((n) => n.id === rel.objectId.toString())!,
//         label: rel.qualifier || '',
//       }))
//     );

//     // Object colors
//     const objectTypes = Array.from(new Set(objectNodes.map((o) => o.label)));
//     const objectColorScale = d3.scaleOrdinal<string>().domain(objectTypes).range(d3.schemeTableau10);

//     const visibleNodes = nodesRef.current.filter((n) => !hiddenNodeIds.has(n.id));
//     const visibleEdges = edgesRef.current.filter(
//       (e) => !hiddenNodeIds.has(e.source.id) && !hiddenNodeIds.has(e.target.id)
//     );

//     visibleNodes.forEach((n) => {
//       n.x = width / 2 + Math.random() * 100 - 50;
//       n.y = height / 2 + Math.random() * 100 - 50;
//     });

//     // --- Draw Edges ---
//     let link = g
//       .selectAll('line')
//       .data(visibleEdges, (d: any) => d.id)
//       .enter()
//       .append('line')
//       .attr('stroke', '#ccc')
//       .attr('stroke-width', 1.2);

//     // --- Draw Nodes ---
//     let nodeGroup = g
//       .selectAll<SVGGElement, NodeDatum>('g.node')
//       .data(visibleNodes, (d: any) => d.id)
//       .enter()
//       .append('g')
//       .attr('class', 'node')
//       .call(
//         d3
//           .drag<SVGGElement, NodeDatum>()
//           .on('start', dragstarted)
//           .on('drag', dragged)
//           .on('end', dragended)
//       );

//     nodeGroup
//       .append('circle')
//       .attr('r', 20)
//       .attr('fill', (d) => (d.type === 'event' ? 'orange' : 'steelblue'))
//       .attr('stroke', '#fff')
//       .attr('stroke-width', 1.5)
//       .on('click', (event, d) => {
//         event.stopPropagation();
//         const [x, y] = d3.pointer(event, svgRef.current);
//         setContextMenu({ x, y, node: d });
//       });

//     // --- Node Labels ---
//     nodeGroup.each(function (d) {
//       const group = d3.select(this);
//       const words = d.label.split(/[\s_]+|(?=[A-Z])/g);
//       const lineHeight = 8;
//       const maxLines = 3;
//       const wrapped: string[] = [];
//       let line = '';
//       words.forEach((w) => {
//         if ((line + ' ' + w).length < 10) line += ' ' + w;
//         else {
//           wrapped.push(line.trim());
//           line = w;
//         }
//       });
//       wrapped.push(line.trim());
//       const finalLines =
//         wrapped.length > maxLines ? [...wrapped.slice(0, maxLines - 1), '...'] : wrapped;

//       const text = group
//         .append('text')
//         .attr('text-anchor', 'middle')
//         .attr('alignment-baseline', 'middle')
//         .attr('font-size', 8)
//         .attr('font-weight', '600')
//         .attr('fill', 'white')
//         .attr('pointer-events', 'none');

//       const offset = (finalLines.length - 1) * -lineHeight * 0.5;
//       text
//         .selectAll('tspan')
//         .data(finalLines)
//         .enter()
//         .append('tspan')
//         .attr('x', 0)
//         .attr('y', (_, i) => offset + i * lineHeight)
//         .text((t) => t);
//     });

//     // --- Force Simulation ---
//     const simulation = d3
//       .forceSimulation<NodeDatum>(visibleNodes)
//       .force('link', d3.forceLink<EdgeDatum, NodeDatum>(visibleEdges).id((d) => d.id).distance(60))
//       .force('charge', d3.forceManyBody().strength(-50))
//       .force('center', d3.forceCenter(width / 2, height / 2))
//       .force('collision', d3.forceCollide().radius(25))
//       .on('tick', ticked);

//     simulationRef.current = simulation;
//     setTimeout(() => simulation.stop(), 4000);

//     function ticked() {
//       link
//         .attr('x1', (d) => d.source.x!)
//         .attr('y1', (d) => d.source.y!)
//         .attr('x2', (d) => d.target.x!)
//         .attr('y2', (d) => d.target.y!);
//       nodeGroup.attr('transform', (d) => `translate(${d.x},${d.y})`);
//     }

//     function dragstarted(event: any, d: any) {
//       if (!event.active) simulation.alphaTarget(0.3).restart();
//       d.fx = d.x;
//       d.fy = d.y;
//     }
//     function dragged(event: any, d: any) {
//       d.fx = event.x;
//       d.fy = event.y;
//     }
//     function dragended(event: any, d: any) {
//       if (!event.active) simulation.alphaTarget(0);
//       d.fx = null;
//       d.fy = null;
//     }

//     // --- Events Histogram ---
//     if (eventsChartRef.current) {
//       const chart = d3.select(eventsChartRef.current);
//       chart.selectAll('*').remove();

//       const activityCounts = d3.rollups(filteredEvents, (v) => v.length, (d) => d.type || 'Unknown');

//       const x = d3.scaleBand().domain(activityCounts.map(([k]) => k)).range([40, 240]).padding(0.1);
//       const y = d3.scaleLinear().domain([0, d3.max(activityCounts, ([, v]) => v)!]).range([120, 10]);

//       chart
//         .append('g')
//         .selectAll('rect')
//         .data(activityCounts)
//         .enter()
//         .append('rect')
//         .attr('x', ([k]) => x(k)!)
//         .attr('y', ([, v]) => y(v))
//         .attr('width', x.bandwidth())
//         .attr('height', ([, v]) => 120 - y(v))
//         .attr('fill', 'orange');

//         chart
//   .selectAll('text.label')
//   .data(activityCounts)
//   .enter()
//   .append('text')
//   .attr('class', 'label')
//   .attr('x', ([k]) => x(k)! + x.bandwidth() / 2)
//   .attr('y', ([, v]) => y(v) - 2)
//   .attr('text-anchor', 'middle')
//   .attr('font-size', 10)
//   .attr('fill', 'black')
//   .text(([, v]) => v);

//       chart
//         .append('g')
//         .attr('transform', 'translate(0,120)')
//         .call(d3.axisBottom(x).tickSize(0))
//         .selectAll('text')
//         .attr('font-size', 7)
//         .attr('text-anchor', 'end')
//         .attr('transform', 'rotate(-35)');
//     }

//     // --- Histogram: Objects per Type ---
// if (objectsChartRef.current) {
//   const chart = d3.select(objectsChartRef.current);
//   chart.selectAll('*').remove();

//   // Count total number of objects per type
//   const typeCounts = d3.rollups(
//     Object.values(objects), // use the full objects data, not just nodes
//     (v) => v.length,
//     (d: any) => d.type || 'Unknown'
//   );

//   const x = d3
//     .scaleBand()
//     .domain(typeCounts.map(([k]) => k))
//     .range([40, 300])
//     .padding(0.1);
//   const y = d3
//     .scaleLinear()
//     .domain([0, d3.max(typeCounts, ([, v]) => v)!])
//     .range([150, 10]);

//   chart
//     .append('g')
//     .selectAll('rect')
//     .data(typeCounts)
//     .enter()
//     .append('rect')
//     .attr('x', ([k]) => x(k)!)
//     .attr('y', ([, v]) => y(v))
//     .attr('width', x.bandwidth())
//     .attr('height', ([, v]) => 150 - y(v))
//     .attr('fill', 'steelblue'); // fixed blue color

//     chart
//   .selectAll('text.label')
//   .data(typeCounts)
//   .enter()
//   .append('text')
//   .attr('class', 'label')
//   .attr('x', ([k]) => x(k)! + x.bandwidth() / 2)
//   .attr('y', ([, v]) => y(v) - 2)
//   .attr('text-anchor', 'middle')
//   .attr('font-size', 10)
//   .attr('fill', 'black')
//   .text(([, v]) => v);

//   chart
//     .append('g')
//     .attr('transform', 'translate(0,150)')
//     .call(d3.axisBottom(x).tickSize(0))
//     .selectAll('text')
//     .attr('font-size', 8)
//     .attr('text-anchor', 'end')
//     .attr('transform', 'rotate(-40)');
//     }
//   }, [data, chunk, selectedTypes, hiddenNodeIds]);

//   // --- Context Menu ---
//   const handleCollapse = (nodeId: string) => {
//     const connectedNodes = edgesRef.current
//       .filter((e) => e.source.id === nodeId || e.target.id === nodeId)
//       .map((e) => (e.source.id === nodeId ? e.target.id : e.source.id));

//     setHiddenNodeIds((prev) => {
//       const newSet = new Set(prev);
//       newSet.add(nodeId);
//       connectedNodes.forEach((id) => newSet.add(id));
//       return newSet;
//     });
//     setContextMenu(null);
//   };

//   const handleExpand = (nodeId: string) => {
//     const connectedNodes = edgesRef.current
//       .filter((e) => e.source.id === nodeId || e.target.id === nodeId)
//       .map((e) => (e.source.id === nodeId ? e.target.id : e.source.id));

//     setHiddenNodeIds((prev) => {
//       const newSet = new Set(prev);
//       newSet.delete(nodeId);
//       connectedNodes.forEach((id) => newSet.delete(id));
//       return newSet;
//     });
//     setContextMenu(null);
//   };

//   const toggleType = (type: string) => {
//     setChunk(1);
//     setSelectedTypes((prev) =>
//       prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
//     );
//   };

//   if (!fileId) return <p>No File selected</p>;
//   if (isLoading) return <p>Loading...</p>;
//   if (error) return <p>Error loading OCEL data</p>;
//   if (!data) return <p>No data available</p>;

//   return (
//     <div className="flex flex-col h-screen bg-gray-50 relative">
//       {/* Context Menu */}
//       {contextMenu && (
//         <div
//           className="absolute bg-white border border-gray-300 shadow-lg rounded-md text-sm z-50"
//           style={{ left: contextMenu.x + 20, top: contextMenu.y }}
//         >
//           <button
//             className="block w-full text-left px-3 py-1 hover:bg-gray-100"
//             onClick={() => handleCollapse(contextMenu.node.id)}
//           >
//             Collapse Node
//           </button>
//           <button
//             className="block w-full text-left px-3 py-1 hover:bg-gray-100"
//             onClick={() => handleExpand(contextMenu.node.id)}
//           >
//             Expand Node
//           </button>
//         </div>
//       )}

//       {/* Filter */}
//       <div className="border-b border-gray-200 p-4 bg-white shadow-sm flex flex-wrap gap-3">
//         <h2 className="font-bold text-gray-700">Filter by Event Type:</h2>
//         {data.eventTypes?.map((type: any, idx: number) => {
//           const typeName = typeof type === 'string' ? type : type.name;
//           return (
//             <div key={idx} className="flex items-center space-x-2">
//               <Checkbox
//                 id={`type-${idx}`}
//                 checked={selectedTypes.includes(typeName)}
//                 onCheckedChange={() => toggleType(typeName)}
//               />
//               <label htmlFor={`type-${idx}`} className="text-sm font-medium leading-none">
//                 {typeName}
//               </label>
//             </div>
//           );
//         })}
//       </div>

//       {/* Graph + Histograms */}
//       <div className="grid grid-cols-4 gap-4 p-4 overflow-auto">
//         <div className="col-span-3 bg-white rounded-xl shadow p-3 relative">
//           <h3 className="font-semibold mb-2 text-center text-gray-700">
//             Event–Object Relationship Graph
//           </h3>
//           <svg ref={svgRef} className="w-full h-[600px] border rounded-lg bg-gray-50" />
//           {chunk * MAX_CHUNK < (data.events?.length || 0) && (
//             <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
//               <button
//                 onClick={() => setChunk((prev) => prev + 1)}
//                 className="px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600"
//               >
//                 Load More Events ({chunk * MAX_CHUNK}/{data.events.length})
//               </button>
//             </div>
//           )}
//         </div>

//         {/* Histograms */}
//         <div className="col-span-1 flex flex-col gap-4">
//           <div className="bg-white rounded-xl shadow p-3">
//             <h3 className="font-semibold mb-2 text-center text-gray-700">
//               Events per Activity
//             </h3>
//             <svg ref={eventsChartRef} className="w-full h-[250px]" />
//           </div>
//           <div className="bg-white rounded-xl shadow p-3">
//             <h3 className="font-semibold mb-2 text-center text-gray-700">
//               Objects per Type
//             </h3>
//             <svg ref={objectsChartRef} className="w-full h-[250px]" />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OcelVisualization;




// import { useEffect, useRef, useState } from 'react';
// import * as d3 from 'd3';
// import { Checkbox } from '~/components/ui/checkbox';
// import { useGetOcel } from '~/services/queries';
// type NodeDatum = {
//     id: string;
//     label: string;
//     type: 'event' | 'object';
//     x?: number;
//     y?: number;
//     fx?: number | null;
//     fy?: number | null;
// };
// type EdgeDatum = {
//     id: string;
//     source: NodeDatum;
//     target: NodeDatum;
//     label: string;
// };
// const MAX_CHUNK = 5;
// const NODE_RADIUS = 20;
// const NODE_GAP = 50;
// interface OcelVisualizationD3Props {
//     fileId: string;
// }
// const OcelVisualization: React.FC<OcelVisualizationD3Props> = ({ fileId }) => {
//     const { data, isLoading, error } = useGetOcel(fileId);
//     const svgRef = useRef<SVGSVGElement | null>(null);
//     const eventsChartRef = useRef<SVGSVGElement | null>(null);
//     const objectsChartRef = useRef<SVGSVGElement | null>(null);
//     const [chunk, setChunk] = useState(1);
//     const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
//     // collapsedNodes: nodes that are collapsed (stay visible but turn gray)
//     const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
//     const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: NodeDatum } | null>(null);
//     const nodesRef = useRef<NodeDatum[]>([]);
//     const edgesRef = useRef<EdgeDatum[]>([]);
//     const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
//     const zoomTransformRef = useRef<d3.ZoomTransform | null>(null);
//     // Immediate neighbors: returns NodeDatum[] (uses current edgesRef)
//     const getImmediateNeighbors = (nodeId: string) => {
//         return edgesRef.current
//             .filter(e => e.source.id === nodeId || e.target.id === nodeId)
//             .map(e => (e.source.id === nodeId ? e.target : e.source));
//     };
//     // Compute hidden nodes based on current collapsedNodes:
//     // A node (not collapsed) is hidden if ALL of its neighbors are collapsed.
//     // (If it has zero neighbors, we do not hide it.)
//     const computeHiddenSet = (): Set<string> => {
//         const hidden = new Set<string>();
//         // build adjacency quickly
//         const adj = new Map<string, Set<string>>();
//         nodesRef.current.forEach(n => adj.set(n.id, new Set<string>()));
//         edgesRef.current.forEach(e => {
//             // add both directions
//             adj.get(e.source.id)?.add(e.target.id);
//             adj.get(e.target.id)?.add(e.source.id);
//         });
//         nodesRef.current.forEach(n => {
//             if (collapsedNodes.has(n.id)) return; // collapsed nodes remain visible (grey)
//             const neighbors = Array.from(adj.get(n.id) || []);
//             if (neighbors.length === 0) return; // no neighbors -> don't hide
//             // hidden if every neighbor is collapsed
//             const allNeighborsCollapsed = neighbors.every(neiId => collapsedNodes.has(neiId));
//             if (allNeighborsCollapsed) hidden.add(n.id);
//         });
//         return hidden;
//     };
//     // Collapse logic: mark node collapsed; collapsed node stays visible and turns grey.
//     // Connected neighbors that have no other (non-collapsed) neighbors will be hidden (handled via computeHiddenSet).
//     const handleCollapse = (nodeId: string) => {
//         setCollapsedNodes(prev => {
//             const next = new Set(prev);
//             next.add(nodeId);
//             return next;
//         });
//         setContextMenu(null);
//     };
//     // Expand logic: remove node from collapsed set; hidden nodes recomputed automatically
//     const handleExpand = (nodeId: string) => {
//         setCollapsedNodes(prev => {
//             const next = new Set(prev);
//             next.delete(nodeId);
//             return next;
//         });
//         setContextMenu(null);
//     };
//     const toggleType = (type: string) => {
//         setChunk(5);
//         setSelectedTypes(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]));
//     };
//     // Main D3 render effect
//     useEffect(() => {
//         if (!data || !svgRef.current) return;
//         const svg = d3.select(svgRef.current);
//         const width = svgRef.current.clientWidth;
//         const height = svgRef.current.clientHeight;
//         svg.selectAll('*').remove();
//         const g = svg.append('g');
//         // Zoom support
//         const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', ev => {
//             g.attr('transform', ev.transform.toString());
//             zoomTransformRef.current = ev.transform;
//         });
//         svg.call(zoom as any);
//         if (zoomTransformRef.current) svg.call(zoom.transform as any, zoomTransformRef.current);
//         const events = data.events || [];
//         const objects = data.objects || [];
//         const filteredEvents = events.filter((evt: any) => selectedTypes.length === 0 || selectedTypes.includes(evt.type));
//         const chunkedEvents = filteredEvents.slice(0, chunk * MAX_CHUNK);
//         // Create event nodes
//         const eventNodes: NodeDatum[] = chunkedEvents.map((evt: any) => ({
//             id: evt.id.toString(),
//             label: evt.type || evt.activity || 'Event',
//             type: 'event',
//         }));
//         // Create object nodes (collect object ids referenced by chunked events)
//         const objectIds = new Set<string>();
//         chunkedEvents.forEach((evt: any) => (evt.relationships || []).forEach((rel: any) => objectIds.add(rel.objectId)));
//         const objectNodes: NodeDatum[] = Array.from(objectIds).map(objId => ({
//             id: objId.toString(),
//             label: objects[objId]?.type || objId,
//             type: 'object',
//         }));
//         nodesRef.current = [...eventNodes, ...objectNodes];
//         // Create edges
//         edgesRef.current = chunkedEvents.flatMap((evt: any) =>
//             (evt.relationships || []).map((rel: any, j: number) => ({
//                 id: `${evt.id}-${rel.objectId}-${j}`,
//                 source: nodesRef.current.find(n => n.id === evt.id.toString())!,
//                 target: nodesRef.current.find(n => n.id === rel.objectId.toString())!,
//                 label: rel.qualifier || '',
//             }))
//         );
//         // Positions: reuse or randomize non-overlapping
//         nodesRef.current.forEach(n => {
//             const saved = positionsRef.current.get(n.id);
//             if (saved) {
//                 n.x = saved.x;
//                 n.y = saved.y;
//             } else {
//                 let newX, newY, overlapping;
//                 do {
//                     newX = width / 2 + Math.random() * 400 - 200;
//                     newY = height / 2 + Math.random() * 400 - 200;
//                     overlapping = Array.from(positionsRef.current.values()).some(p => Math.hypot(p.x - newX, p.y - newY) < NODE_GAP);
//                 } while (overlapping);
//                 n.x = newX;
//                 n.y = newY;
//                 positionsRef.current.set(n.id, { x: n.x, y: n.y });
//             }
//         });
//         // Compute hidden set from collapsedNodes
//         const hiddenSet = computeHiddenSet();
//         // Draw edges: show only if both endpoints are NOT hidden
//         const visibleEdges = edgesRef.current.filter(e => !hiddenSet.has(e.source.id) && !hiddenSet.has(e.target.id));
//         g.selectAll('line')
//             .data(visibleEdges, (d: any) => d.id)
//             .enter()
//             .append('line')
//             .attr('stroke', 'black')
//             .attr('stroke-width', 1.8)
//             .attr('x1', d => d.source.x!)
//             .attr('y1', d => d.source.y!)
//             .attr('x2', d => d.target.x!)
//             .attr('y2', d => d.target.y!);
//         // Node groups: bind only visible nodes (visible = not hidden)
//         const visibleNodes = nodesRef.current.filter(n => !hiddenSet.has(n.id));
//         const nodeGroup = g
//             .selectAll<SVGGElement, NodeDatum>('g.node')
//             .data(visibleNodes, (d: any) => d.id)
//             .enter()
//             .append('g')
//             .attr('class', 'node')
//             .attr('transform', d => `translate(${d.x},${d.y})`)
//             .call(
//                 d3
//                     .drag<SVGGElement, NodeDatum>()
//                     .on('start', dragstarted)
//                     .on('drag', dragged)
//                     .on('end', dragended)
//             );
//         nodeGroup
//             .append('circle')
//             .attr('r', NODE_RADIUS)
//             .attr('fill', d => (collapsedNodes.has(d.id) ? 'lightgray' : d.type === 'event' ? 'orange' : 'steelblue'))
//             .attr('stroke', '#fff')
//             .attr('stroke-width', 1.5)
//             .style('cursor', 'pointer')
//             .on('click', (event, d) => {
//                 event.stopPropagation();
//                 const [x, y] = d3.pointer(event, svgRef.current);
//                 setContextMenu({ x, y, node: d });
//             });
//         // Labels with wrapping (basic)
//         nodeGroup.each(function (d) {
//             const group = d3.select(this);
//             const words = d.label ? d.label.split(/[\s_]+|(?=[A-Z])/g) : [d.id];
//             const lineHeight = 8;
//             const maxLines = 3;
//             const wrapped: string[] = [];
//             let line = '';
//             words.forEach(w => {
//                 if ((line + ' ' + w).length < 10) line += ' ' + w;
//                 else {
//                     wrapped.push(line.trim());
//                     line = w;
//                 }
//             });
//             if (line.trim()) wrapped.push(line.trim());
//             const finalLines = wrapped.length > maxLines ? [...wrapped.slice(0, maxLines - 1), '...'] : wrapped;
//             const text = group
//                 .append('text')
//                 .attr('text-anchor', 'middle')
//                 .attr('alignment-baseline', 'middle')
//                 .attr('font-size', 8)
//                 .attr('font-weight', '600')
//                 .attr('fill', 'white')
//                 .attr('pointer-events', 'none');
//             const offset = (finalLines.length - 1) * -lineHeight * 0.5;
//             text.selectAll('tspan')
//                 .data(finalLines)
//                 .enter()
//                 .append('tspan')
//                 .attr('x', 0)
//                 .attr('y', (_, i) => offset + i * lineHeight)
//                 .text(t => t);
//         });
//         // Drag handlers update positions and redraw edge endpoints
//         function dragstarted(event: any, d: any) {
//             d.fx = d.x;
//             d.fy = d.y;
//         }
//         function dragged(event: any, d: any) {
//             d.x = event.x;
//             d.y = event.y;
//             positionsRef.current.set(d.id, { x: d.x, y: d.y });
//             d3.select(this).attr('transform', `translate(${d.x},${d.y})`);
//             // update lines (only visible ones)
//             g.selectAll('line')
//                 .attr('x1', (ed: any) => ed.source.x)
//                 .attr('y1', (ed: any) => ed.source.y)
//                 .attr('x2', (ed: any) => ed.target.x)
//                 .attr('y2', (ed: any) => ed.target.y);
//         }
//         function dragended(event: any, d: any) {
//             d.fx = null;
//             d.fy = null;
//         }
//     }, [data, chunk, selectedTypes, collapsedNodes]); // re-render when collapsedNodes changes
//     // Histogram Logic (unchanged)
//     useEffect(() => {
//         if (!data) return;
//         const tooltip = d3
//             .select('body')
//             .append('div')
//             .attr('class', 'd3-tooltip')
//             .style('position', 'absolute')
//             .style('background', 'rgba(0,0,0,0.7)')
//             .style('color', 'white')
//             .style('padding', '6px 10px')
//             .style('border-radius', '6px')
//             .style('font-size', '12px')
//             .style('pointer-events', 'none')
//             .style('opacity', 0);
//         const createHistogram = (ref: SVGSVGElement, dataArr: [string, number][], fillColor: string) => {
//             const svg = d3.select(ref);
//             svg.selectAll('*').remove();
//             const width = svg.node()?.clientWidth || 250;
//             const height = svg.node()?.clientHeight || 200;
//             const margin = { top: 20, right: 20, bottom: 50, left: 40 };
//             const x = d3
//                 .scaleBand()
//                 .domain(dataArr.map(([k]) => k))
//                 .range([margin.left, width - margin.right])
//                 .padding(0.2);
//             const y = d3
//                 .scaleLinear()
//                 .domain([0, d3.max(dataArr, d => d[1])!])
//                 .nice()
//                 .range([height - margin.bottom, margin.top]);
//             svg.append('g')
//                 .selectAll('rect')
//                 .data(dataArr)
//                 .enter()
//                 .append('rect')
//                 .attr('x', d => x(d[0])!)
//                 .attr('y', d => y(d[1]))
//                 .attr('width', x.bandwidth())
//                 .attr('height', d => y(0) - y(d[1]))
//                 .attr('fill', fillColor)
//                 .on('mouseover', (event, [, v]) => {
//                     tooltip.style('opacity', 1).html(`<strong>Count:</strong> ${v}`);
//                 })
//                 .on('mousemove', (event) => {
//                     tooltip.style('left', event.pageX + 10 + 'px').style('top', event.pageY - 20 + 'px');
//                 })
//                 .on('mouseout', () => {
//                     tooltip.style('opacity', 0);
//                 });
//             svg.append('g')
//                 .attr('transform', `translate(0,${height - margin.bottom})`)
//                 .call(d3.axisBottom(x))
//                 .selectAll('text')
//                 .attr('transform', 'rotate(-35)')
//                 .style('text-anchor', 'end')
//                 .attr('font-size', 9);
//             svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y));
//         };
//         const activityCounts = d3.rollups(
//             data.events || [],
//             (v) => v.length,
//             (d) => d.type || d.activity || 'Unknown'
//         );
//         const typeCounts = d3.rollups(
//             Object.values(data.objects || {}),
//             (v: any) => v.length,
//             (d: any) => d.type || 'Unknown'
//         );
//         if (eventsChartRef.current) createHistogram(eventsChartRef.current, activityCounts, 'orange');
//         if (objectsChartRef.current) createHistogram(objectsChartRef.current, typeCounts, 'steelblue');
//         return () => tooltip.remove();
//     }, [data]);
//     if (!fileId) return <p>No File selected</p>;
//     if (isLoading) return <p>Loading...</p>;
//     if (error) return <p>Error loading OCEL data</p>;
//     if (!data) return <p>No data available</p>;
//     return (
//         <div className="flex flex-col h-screen bg-gray-50 relative">
//             {contextMenu && (
//                 <div
//                     className="absolute bg-white border border-gray-300 shadow-lg rounded-md text-sm z-50"
//                     style={{ left: contextMenu.x + 20, top: contextMenu.y }}
//                 >
//                     <button
//                         className="block w-full text-left px-3 py-1 hover:bg-gray-100"
//                         onClick={() => handleCollapse(contextMenu.node.id)}
//                     >
//                         Collapse Connected
//                     </button>
//                     <button
//                         className="block w-full text-left px-3 py-1 hover:bg-gray-100"
//                         onClick={() => handleExpand(contextMenu.node.id)}
//                     >
//                         Expand Connected
//                     </button>
//                 </div>
//             )}
//             <div className="border-b border-gray-200 p-4 bg-white shadow-sm flex flex-wrap gap-3">
//                 <h2 className="font-bold text-gray-700">Filter by Event Type:</h2>
//                 {data.eventTypes?.map((type: any, idx: number) => {
//                     const typeName = typeof type === 'string' ? type : type.name;
//                     return (
//                         <div key={idx} className="flex items-center space-x-2">
//                             <Checkbox
//                                 id={`type-${idx}`}
//                                 checked={selectedTypes.includes(typeName)}
//                                 onCheckedChange={() => toggleType(typeName)}
//                             />
//                             <label htmlFor={`type-${idx}`} className="text-sm font-medium leading-none">
//                                 {typeName}
//                             </label>
//                         </div>
//                     );
//                 })}
//             </div>
//             <div className="grid grid-cols-4 gap-4 p-4 overflow-auto">
//                 <div className="col-span-3 bg-white rounded-xl shadow p-3 relative">
//                     <h3 className="font-semibold mb-2 text-center text-gray-700">Event–Object Relationship Graph</h3>
//                     <svg ref={svgRef} className="w-full h-[600px] border rounded-lg bg-gray-50" />
//                     {chunk * MAX_CHUNK < (data.events?.length || 0) && (
//                         <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
//                             <button
//                                 onClick={() => setChunk((prev) => prev + 1)}
//                                 className="px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600"
//                             >
//                                 Load More Events ({chunk * MAX_CHUNK}/{data.events.length})
//                             </button>
//                         </div>
//                     )}
//                 </div>
//                 <div className="col-span-1 flex flex-col gap-4">
//                     <div className="bg-white rounded-xl shadow p-3">
//                         <h3 className="font-semibold mb-2 text-center text-gray-700">Events per Activity</h3>
//                         <svg ref={eventsChartRef} className="w-full h-[250px]" />
//                     </div>
//                     <div className="bg-white rounded-xl shadow p-3">
//                         <h3 className="font-semibold mb-2 text-center text-gray-700">Objects per Type</h3>
//                         <svg ref={objectsChartRef} className="w-full h-[250px]" />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };
// export default OcelVisualization;
// import { useEffect, useRef, useState } from 'react';
// import * as d3 from 'd3';
// import { Checkbox } from '~/components/ui/checkbox';
// import { useGetOcel } from '~/services/queries';
// type NodeDatum = {
//     id: string;
//     label: string;
//     type: 'event' | 'object';
//     x?: number;
//     y?: number;
//     fx?: number | null;
//     fy?: number | null;
// };
// type EdgeDatum = {
//     id: string;
//     source: NodeDatum;
//     target: NodeDatum;
//     label: string;
// };
// const MAX_CHUNK = 5;
// const NODE_RADIUS = 20;
// const NODE_GAP = 50;
// interface OcelVisualizationD3Props {
//     fileId: string;
// }
// const OcelVisualization: React.FC<OcelVisualizationD3Props> = ({ fileId }) => {
//     const { data, isLoading, error } = useGetOcel(fileId);
//     const svgRef = useRef<SVGSVGElement | null>(null);
//     const eventsChartRef = useRef<SVGSVGElement | null>(null);
//     const objectsChartRef = useRef<SVGSVGElement | null>(null);
//     const [chunk, setChunk] = useState(1);
//     const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
//     const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
//     const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: NodeDatum } | null>(null);
//     const nodesRef = useRef<NodeDatum[]>([]);
//     const edgesRef = useRef<EdgeDatum[]>([]);
//     const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
//     const zoomTransformRef = useRef<d3.ZoomTransform | null>(null);
//     // Immediate neighbors
//     const getImmediateNeighbors = (nodeId: string) => {
//         return edgesRef.current
//             .filter(e => e.source.id === nodeId || e.target.id === nodeId)
//             .map(e => (e.source.id === nodeId ? e.target : e.source));
//     };
//     const computeHiddenSet = (): Set<string> => {
//         const hidden = new Set<string>();
//         const adj = new Map<string, Set<string>>();
//         nodesRef.current.forEach(n => adj.set(n.id, new Set<string>()));
//         edgesRef.current.forEach(e => {
//             adj.get(e.source.id)?.add(e.target.id);
//             adj.get(e.target.id)?.add(e.source.id);
//         });
//         nodesRef.current.forEach(n => {
//             if (collapsedNodes.has(n.id)) return;
//             const neighbors = Array.from(adj.get(n.id) || []);
//             if (neighbors.length === 0) return;
//             const allNeighborsCollapsed = neighbors.every(neiId => collapsedNodes.has(neiId));
//             if (allNeighborsCollapsed) hidden.add(n.id);
//         });
//         return hidden;
//     };
//     const handleCollapse = (nodeId: string) => {
//         setCollapsedNodes(prev => {
//             const next = new Set(prev);
//             next.add(nodeId);
//             return next;
//         });
//         setContextMenu(null);
//     };
// // nodeId is the ID of the object node you want to expand
// const getConnectedEvents = (objectId: string) => {
//     // Filter edges where the object is a source or target
//     const connectedEdges = edgesRef.current.filter(
//         (e) => e.source.id === objectId || e.target.id === objectId
//     );
// //     function getEventsForObject(objectId: string, data: any) {
// //     return data.events.filter((evt: any) =>
// //         (evt.relationships || []).some((rel: any) => rel.objectId === objectId)
// //     );
// // }
// // console.log('kjhgfdfg');
// // console.log(  getEventsForObject("i-880002", data));
//     // Map the edges to the connected nodes that are of type 'event'
//     const connectedEvents = connectedEdges
//         .map((e) => (e.source.id === objectId ? e.target : e.source))
//         .filter((n) => n.type === 'event');
//     return connectedEvents;
// };
//    const handleExpand = (nodeId: string) => {
//     setCollapsedNodes(prev => {
//         const next = new Set(prev);
//         next.delete(nodeId);
//         const node = nodesRef.current.find(n => n.id === nodeId);
//         if (!node) return next;
//         if (node.type === 'object') {
//             const connectedEvents = getConnectedEvents(nodeId);
//             console.log("Connected events for object", nodeId, connectedEvents);
//             connectedEvents.forEach(eventNode => {
//                 next.delete(eventNode.id); // make event visible
//                 // Optionally, also show objects connected to this event
//                 const objEdges = edgesRef.current.filter(
//                     e => e.source.id === eventNode.id || e.target.id === eventNode.id
//                 );
//                 objEdges.forEach(ed => {
//                     const objNode = ed.source.id === eventNode.id ? ed.target : ed.source;
//                     if (objNode.type === 'object') next.delete(objNode.id);
//                 });
//             });
//         }
//         return next;
//     });
//     setContextMenu(null);
// };
//     const toggleType = (type: string) => {
//         setChunk(5);
//         setSelectedTypes(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]));
//     };
//     useEffect(() => {
//         if (!data || !svgRef.current) return;
//         const svg = d3.select(svgRef.current);
//         const width = svgRef.current.clientWidth;
//         const height = svgRef.current.clientHeight;
//         svg.selectAll('*').remove();
//         const g = svg.append('g');
//         const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', ev => {
//             g.attr('transform', ev.transform.toString());
//             zoomTransformRef.current = ev.transform;
//         });
//         svg.call(zoom as any);
//         if (zoomTransformRef.current) svg.call(zoom.transform as any, zoomTransformRef.current);
//         const events = data.events || [];
//         const objects = data.objects || [];
//         const filteredEvents = events.filter((evt: any) => selectedTypes.length === 0 || selectedTypes.includes(evt.type));
//         const chunkedEvents = filteredEvents.slice(0, chunk * MAX_CHUNK);
//         const eventNodes: NodeDatum[] = chunkedEvents.map((evt: any) => ({
//             id: evt.id.toString(),
//             label: evt.type || evt.activity || 'Event',
//             type: 'event',
//         }));
//         const objectIds = new Set<string>();
//         chunkedEvents.forEach((evt: any) => (evt.relationships || []).forEach((rel: any) => objectIds.add(rel.objectId)));
//         const objectNodes: NodeDatum[] = Array.from(objectIds).map(objId => ({
//             id: objId.toString(),
//             label: objects[objId]?.type || objId,
//             type: 'object',
//         }));
//         nodesRef.current = [...eventNodes, ...objectNodes];
//         edgesRef.current = chunkedEvents.flatMap((evt: any) =>
//             (evt.relationships || []).map((rel: any, j: number) => ({
//                 id: `${evt.id}-${rel.objectId}-${j}`,
//                 source: nodesRef.current.find(n => n.id === evt.id.toString())!,
//                 target: nodesRef.current.find(n => n.id === rel.objectId.toString())!,
//                 label: rel.qualifier || '',
//             }))
//         );
//         nodesRef.current.forEach(n => {
//             const saved = positionsRef.current.get(n.id);
//             if (saved) {
//                 n.x = saved.x;
//                 n.y = saved.y;
//             } else {
//                 let newX, newY, overlapping;
//                 do {
//                     newX = width / 2 + Math.random() * 400 - 200;
//                     newY = height / 2 + Math.random() * 400 - 200;
//                     overlapping = Array.from(positionsRef.current.values()).some(p => Math.hypot(p.x - newX, p.y - newY) < NODE_GAP);
//                 } while (overlapping);
//                 n.x = newX;
//                 n.y = newY;
//                 positionsRef.current.set(n.id, { x: n.x, y: n.y });
//             }
//         });
//         const hiddenSet = computeHiddenSet();
//         const visibleEdges = edgesRef.current.filter(e => !hiddenSet.has(e.source.id) && !hiddenSet.has(e.target.id));
//         g.selectAll('line')
//             .data(visibleEdges, (d: any) => d.id)
//             .enter()
//             .append('line')
//             .attr('stroke', 'black')
//             .attr('stroke-width', 1.8)
//             .attr('x1', d => d.source.x!)
//             .attr('y1', d => d.source.y!)
//             .attr('x2', d => d.target.x!)
//             .attr('y2', d => d.target.y!);
//         const visibleNodes = nodesRef.current.filter(n => !hiddenSet.has(n.id));
//         const nodeGroup = g
//             .selectAll<SVGGElement, NodeDatum>('g.node')
//             .data(visibleNodes, (d: any) => d.id)
//             .enter()
//             .append('g')
//             .attr('class', 'node')
//             .attr('transform', d => `translate(${d.x},${d.y})`)
//             .call(
//                 d3
//                     .drag<SVGGElement, NodeDatum>()
//                     .on('start', dragstarted)
//                     .on('drag', dragged)
//                     .on('end', dragended)
//             );
//         nodeGroup
//             .append('circle')
//             .attr('r', NODE_RADIUS)
//             .attr('fill', d => (collapsedNodes.has(d.id) ? 'lightgray' : d.type === 'event' ? 'orange' : 'steelblue'))
//             .attr('stroke', '#fff')
//             .attr('stroke-width', 1.5)
//             .style('cursor', 'pointer')
//             .on('click', (event, d) => {
//                 event.stopPropagation();
//                 const [x, y] = d3.pointer(event, svgRef.current);
//                 setContextMenu({ x, y, node: d });
//             });
//         nodeGroup.each(function (d) {
//             const group = d3.select(this);
//             const words = d.label ? d.label.split(/[\s_]+|(?=[A-Z])/g) : [d.id];
//             const lineHeight = 8;
//             const maxLines = 3;
//             const wrapped: string[] = [];
//             let line = '';
//             words.forEach(w => {
//                 if ((line + ' ' + w).length < 10) line += ' ' + w;
//                 else {
//                     wrapped.push(line.trim());
//                     line = w;
//                 }
//             });
//             if (line.trim()) wrapped.push(line.trim());
//             const finalLines = wrapped.length > maxLines ? [...wrapped.slice(0, maxLines - 1), '...'] : wrapped;
//             const text = group
//                 .append('text')
//                 .attr('text-anchor', 'middle')
//                 .attr('alignment-baseline', 'middle')
//                 .attr('font-size', 8)
//                 .attr('font-weight', '600')
//                 .attr('fill', 'white')
//                 .attr('pointer-events', 'none');
//             const offset = (finalLines.length - 1) * -lineHeight * 0.5;
//             text.selectAll('tspan')
//                 .data(finalLines)
//                 .enter()
//                 .append('tspan')
//                 .attr('x', 0)
//                 .attr('y', (_, i) => offset + i * lineHeight)
//                 .text(t => t);
//         });
//         function dragstarted(event: any, d: any) {
//             d.fx = d.x;
//             d.fy = d.y;
//         }
//         function dragged(event: any, d: any) {
//             d.x = event.x;
//             d.y = event.y;
//             positionsRef.current.set(d.id, { x: d.x, y: d.y });
//             d3.select(this).attr('transform', `translate(${d.x},${d.y})`);
//             g.selectAll('line')
//                 .attr('x1', (ed: any) => ed.source.x)
//                 .attr('y1', (ed: any) => ed.source.y)
//                 .attr('x2', (ed: any) => ed.target.x)
//                 .attr('y2', (ed: any) => ed.target.y);
//         }
//         function dragended(event: any, d: any) {
//             d.fx = null;
//             d.fy = null;
//         }
//     }, [data, chunk, selectedTypes, collapsedNodes]);
//     // Histogram logic unchanged
//     useEffect(() => {
//         if (!data) return;
//         const tooltip = d3
//             .select('body')
//             .append('div')
//             .attr('class', 'd3-tooltip')
//             .style('position', 'absolute')
//             .style('background', 'rgba(0,0,0,0.7)')
//             .style('color', 'white')
//             .style('padding', '6px 10px')
//             .style('border-radius', '6px')
//             .style('font-size', '12px')
//             .style('pointer-events', 'none')
//             .style('opacity', 0);
//         const createHistogram = (ref: SVGSVGElement, dataArr: [string, number][], fillColor: string) => {
//             const svg = d3.select(ref);
//             svg.selectAll('*').remove();
//             const width = svg.node()?.clientWidth || 250;
//             const height = svg.node()?.clientHeight || 200;
//             const margin = { top: 20, right: 20, bottom: 50, left: 40 };
//             const x = d3
//                 .scaleBand()
//                 .domain(dataArr.map(([k]) => k))
//                 .range([margin.left, width - margin.right])
//                 .padding(0.2);
//             const y = d3
//                 .scaleLinear()
//                 .domain([0, d3.max(dataArr, d => d[1])!])
//                 .nice()
//                 .range([height - margin.bottom, margin.top]);
//             svg.append('g')
//                 .selectAll('rect')
//                 .data(dataArr)
//                 .enter()
//                 .append('rect')
//                 .attr('x', d => x(d[0])!)
//                 .attr('y', d => y(d[1]))
//                 .attr('width', x.bandwidth())
//                 .attr('height', d => y(0) - y(d[1]))
//                 .attr('fill', fillColor)
//                 .on('mouseover', (event, [, v]) => {
//                     tooltip.style('opacity', 1).html(`<strong>Count:</strong> ${v}`);
//                 })
//                 .on('mousemove', (event) => {
//                     tooltip.style('left', event.pageX + 10 + 'px').style('top', event.pageY - 20 + 'px');
//                 })
//                 .on('mouseout', () => {
//                     tooltip.style('opacity', 0);
//                 });
//             svg.append('g')
//                 .attr('transform', `translate(0,${height - margin.bottom})`)
//                 .call(d3.axisBottom(x))
//                 .selectAll('text')
//                 .attr('transform', 'rotate(-35)')
//                 .style('text-anchor', 'end')
//                 .attr('font-size', 9);
//             svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y));
//         };
//         const activityCounts = d3.rollups(
//             data.events || [],
//             (v) => v.length,
//             (d) => d.type || d.activity || 'Unknown'
//         );
//         const typeCounts = d3.rollups(
//             Object.values(data.objects || {}),
//             (v: any) => v.length,
//             (d: any) => d.type || 'Unknown'
//         );
//         if (eventsChartRef.current) createHistogram(eventsChartRef.current, activityCounts, 'orange');
//         if (objectsChartRef.current) createHistogram(objectsChartRef.current, typeCounts, 'steelblue');
//         return () => tooltip.remove();
//     }, [data]);
//     if (!fileId) return <p>No File selected</p>;
//     if (isLoading) return <p>Loading...</p>;
//     if (error) return <p>Error loading OCEL data</p>;
//     if (!data) return <p>No data available</p>;
//         return (
//         <div className="flex flex-col h-screen bg-gray-50 relative">
//             {contextMenu && (
//                 <div
//                     className="absolute bg-white border border-gray-300 shadow-lg rounded-md text-sm z-50"
//                     style={{ left: contextMenu.x + 20, top: contextMenu.y }}
//                 >
//                     <button
//                         className="block w-full text-left px-3 py-1 hover:bg-gray-100"
//                         onClick={() => handleCollapse(contextMenu.node.id)}
//                     >
//                         Collapse Connected
//                     </button>
//                     <button
//                         className="block w-full text-left px-3 py-1 hover:bg-gray-100"
//                         onClick={() => handleExpand(contextMenu.node.id)}
//                     >
//                         Expand Connected
//                     </button>
//                 </div>
//             )}
//             <div className="border-b border-gray-200 p-4 bg-white shadow-sm flex flex-wrap gap-3">
//                 <h2 className="font-bold text-gray-700">Filter by Event Type:</h2>
//                 {data.eventTypes?.map((type: any, idx: number) => {
//                     const typeName = typeof type === 'string' ? type : type.name;
//                     return (
//                         <div key={idx} className="flex items-center space-x-2">
//                             <Checkbox
//                                 id={`type-${idx}`}
//                                 checked={selectedTypes.includes(typeName)}
//                                 onCheckedChange={() => toggleType(typeName)}
//                             />
//                             <label htmlFor={`type-${idx}`} className="text-sm font-medium leading-none">
//                                 {typeName}
//                             </label>
//                         </div>
//                     );
//                 })}
//             </div>
//             <div className="grid grid-cols-4 gap-4 p-4 overflow-auto">
//                 <div className="col-span-3 bg-white rounded-xl shadow p-3 relative">
//                     <h3 className="font-semibold mb-2 text-center text-gray-700">Event–Object Relationship Graph</h3>
//                     <svg ref={svgRef} className="w-full h-[600px] border rounded-lg bg-gray-50" />
//                     {chunk * MAX_CHUNK < (data.events?.length || 0) && (
//                         <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
//                             <button
//                                 onClick={() => setChunk((prev) => prev + 1)}
//                                 className="px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600"
//                             >
//                                 Load More Events ({chunk * MAX_CHUNK}/{data.events.length})
//                             </button>
//                         </div>
//                     )}
//                 </div>
//                 <div className="col-span-1 flex flex-col gap-4">
//                     <div className="bg-white rounded-xl shadow p-3">
//                         <h3 className="font-semibold mb-2 text-center text-gray-700">Events per Activity</h3>
//                         <svg ref={eventsChartRef} className="w-full h-[250px]" />
//                     </div>
//                     <div className="bg-white rounded-xl shadow p-3">
//                         <h3 className="font-semibold mb-2 text-center text-gray-700">Objects per Type</h3>
//                         <svg ref={objectsChartRef} className="w-full h-[250px]" />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };
// export default OcelVisualization;




import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Checkbox } from '~/components/ui/checkbox';
import { useGetOcel } from '~/services/queries';

// import { getImmediateNeighbors } from '../ocel-visualization/utils/graphUtils';

type NodeDatum = {
    id: string;
    label: string;
    type: 'event' | 'object';
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
};

type EdgeDatum = {
    id: string;
    source: NodeDatum;
    target: NodeDatum;
    label: string;
};

const MAX_CHUNK = 5;
const NODE_RADIUS = 20;
const NODE_GAP = 40;

interface OcelVisualizationD3Props {
    fileId: string;
}

const OcelVisualization: React.FC<OcelVisualizationD3Props> = ({ fileId }) => {
    const { data, isLoading, error } = useGetOcel(fileId);

    const svgRef = useRef<SVGSVGElement | null>(null);
    const eventsChartRef = useRef<SVGSVGElement | null>(null);
    const objectsChartRef = useRef<SVGSVGElement | null>(null);

    const [chunk, setChunk] = useState(1);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: NodeDatum } | null>(null);

    const nodesRef = useRef<NodeDatum[]>([]);
    const edgesRef = useRef<EdgeDatum[]>([]);
    const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const zoomTransformRef = useRef<d3.ZoomTransform | null>(null);

    const getNodeEdges = (nodeId: string) => {
        return edgesRef.current.filter((e) => e.source.id === nodeId || e.target.id === nodeId);
    };

    // Get immediate neighbors
    // const getImmediateNeighbors = (nodeId: string): NodeDatum[] => {
    //     return edgesRef.current
    //         .filter((e) => e.source.id === nodeId || e.target.id === nodeId)
    //         .map((e) => (e.source.id === nodeId ? e.target : e.source));
    // };

    // const getDanglingNeighbors = (nodeId: string): NodeDatum[] => {
    //     // 1. Get all immediate neighbors using the existing function
    //     const immediateNeighbors = edgesRef.current
    //         .filter((e) => e.source.id === nodeId || e.target.id === nodeId)
    //         .map((e) => (e.source.id === nodeId ? e.target : e.source));

    //     // 2. Filter the neighbors: only keep those that have NO other connections
    //     return immediateNeighbors.filter((neighbor) => {
    //         // This condition checks every single edge (e) in the graph again.
    //         // If the neighbor's ID is the source OR the target of any edge other than the one connecting to nodeId, it is NOT a dangling node.
    //         const hasOtherConnections = edgesRef.current.some(
    //             (e) =>
    //                 (e.source.id === neighbor.id || e.target.id === neighbor.id) &&
    //                 e.source.id !== nodeId &&
    //                 e.target.id !== nodeId
    //         );

    //         // A node is "dangling" if it does NOT have other connections.
    //         return !hasOtherConnections;
    //     });
    // };

    // Define this helper function outside the main useEffect
    const getDanglingNeighbors = (nodeId: string, allEdges: EdgeDatum[]): NodeDatum[] => {
        // 1. Get all immediate neighbors
        const immediateNeighbors = allEdges
            .filter((e) => e.source.id === nodeId || e.target.id === nodeId)
            .map((e) => (e.source.id === nodeId ? e.target : e.source));

        // 2. Filter neighbors to find those that are ONLY connected to nodeId
        return immediateNeighbors.filter((neighbor) => {
            // Check if the neighbor is connected to any other node besides the original nodeId
            const hasOtherConnections = allEdges.some(
                (e) =>
                    // Check if this edge connects to the neighbor
                    (e.source.id === neighbor.id || e.target.id === neighbor.id) &&
                    // AND check that this edge does NOT connect back to the starting node (nodeId)
                    e.source.id !== nodeId &&
                    e.target.id !== nodeId
            );

            // A node is "dangling" (and should be hidden) if it does NOT have other connections.
            return !hasOtherConnections;
        });
    };

    // // Expand object node and show all connected events
    // const handleExpand = (nodeId: string) => {
    //     const node = nodesRef.current.find((n) => n.id === nodeId);
    //     if (!node) return;

    //     const newCollapsed = new Set(collapsedNodes);
    //     newCollapsed.delete(nodeId);

    //     if (node.type === 'object') {
    //         // Find all events connected to this object from the OCEL data
    //         const connectedEvents = (data.events || []).filter((evt: any) =>
    //             (evt.relationships || []).some((rel: any) => rel.objectId === nodeId)
    //         );

    //         connectedEvents.forEach((evt: any) => {
    //             const evtId = evt.id.toString();
    //             // If event node is not yet in nodesRef, add it
    //             if (!nodesRef.current.find((n) => n.id === evtId)) {
    //                 nodesRef.current.push({
    //                     id: evtId,
    //                     label: evt.type || evt.activity || 'Event',
    //                     type: 'event',
    //                     x: node.x! + Math.random() * 80 - 40, // random nearby position
    //                     y: node.y! + Math.random() * 80 - 40,
    //                 });
    //                 positionsRef.current.set(evtId, { x: node.x! + Math.random() * 80 - 40, y: node.y! + Math.random() * 80 - 40 });
    //             }
    //             // Remove event node from collapsed set
    //             newCollapsed.delete(evtId);

    //             // Add edges if not already present
    //             if (!edgesRef.current.find((e) => e.source.id === evtId && e.target.id === nodeId)) {
    //                 edgesRef.current.push({
    //                     id: `${evtId}-${nodeId}`,
    //                     source: nodesRef.current.find((n) => n.id === evtId)!,
    //                     target: node,
    //                     label: '',
    //                 });
    //             }
    //         });
    //     }

    //     setCollapsedNodes(newCollapsed);
    //     setContextMenu(null);
    // };

    // const [updateFlag, setUpdateFlag] = useState(0);

    // const handleExpand = (nodeId: string) => {
    //     const node = nodesRef.current.find((n) => n.id === nodeId);
    //     if (!node) return;

    //     const newCollapsed = new Set(collapsedNodes);
    //     newCollapsed.delete(nodeId);

    //     if (node.type === 'object') {
    //         const connectedEvents = (data.events || []).filter((evt: any) =>
    //             (evt.relationships || []).some((rel: any) => rel.objectId === nodeId)
    //         );

    //         connectedEvents.forEach((evt: any, index: number) => {
    //             const evtId = evt.id.toString();
    //             let evtNode = nodesRef.current.find((n) => n.id === evtId);
    //             if (!evtNode) {
    //                 const RADIUS = 70;
    //                 const totalEvents = connectedEvents.length;

    //                 const angle = (index / totalEvents) * 2 * Math.PI;
    //                 evtNode = {
    //                     id: evtId,
    //                     label: evt.type || evt.activity || 'Event',
    //                     type: 'event',
    //                     x: node.x! + RADIUS * Math.cos(angle),
    //                     y: node.y! + RADIUS * Math.sin(angle),
    //                 };
    //                 nodesRef.current.push(evtNode);
    //                 positionsRef.current.set(evtId, { x: evtNode.x, y: evtNode.y });
    //             }

    //             // Add edge between object and event
    //             if (
    //                 !edgesRef.current.find(
    //                     (e) =>
    //                         (e.source.id === evtId && e.target.id === nodeId) ||
    //                         (e.source.id === nodeId && e.target.id === evtId)
    //                 )
    //             ) {
    //                 edgesRef.current.push({
    //                     id: `${evtId}-${nodeId}`,
    //                     source: evtNode,
    //                     target: node,
    //                     label: '',
    //                 });
    //             }

    //             newCollapsed.delete(evtId);
    //         });
    //     }

    //     setCollapsedNodes(newCollapsed);
    //     setContextMenu(null);

    //     // Force re-render
    //     setUpdateFlag((prev) => prev + 1);
    // };

    const [updateFlag, setUpdateFlag] = useState(0);

    const handleExpand = (nodeId: string) => {
        const node = nodesRef.current.find((n) => n.id === nodeId);
        if (!node) return;

        const newCollapsed = new Set(collapsedNodes);
        // Ensure the clicked node itself is marked as expanded
        newCollapsed.delete(nodeId);

        // =========================================================
        // 1. EXPAND OBJECT NODE: Show all connected Events
        // =========================================================
        if (node.type === 'object') {
            const connectedEvents = (data.events || []).filter((evt: any) =>
                (evt.relationships || []).some((rel: any) => rel.objectId === nodeId)
            );

            connectedEvents.forEach((evt: any, index: number) => {
                const evtId = evt.id.toString();
                let evtNode = nodesRef.current.find((n) => n.id === evtId);

                // Positioning parameters for radial layout
                const RADIUS = 70;
                const totalEvents = connectedEvents.length;
                const angle = (index / totalEvents) * 2 * Math.PI;

                // Add Event Node if it doesn't exist
                if (!evtNode) {
                    evtNode = {
                        id: evtId,
                        label: evt.type || evt.activity || 'Event',
                        type: 'event',
                        x: node.x! + RADIUS * Math.cos(angle),
                        y: node.y! + RADIUS * Math.sin(angle),
                    };
                    nodesRef.current.push(evtNode);
                    positionsRef.current.set(evtId, { x: evtNode.x, y: evtNode.y });
                }

                // Add edge between object and event
                if (
                    !edgesRef.current.find(
                        (e) =>
                            (e.source.id === evtId && e.target.id === nodeId) ||
                            (e.source.id === nodeId && e.target.id === evtId)
                    )
                ) {
                    edgesRef.current.push({
                        id: `${evtId}-${nodeId}`,
                        source: evtNode,
                        target: node,
                        label: '',
                    });
                }

                newCollapsed.delete(evtId);
            });
        }
        // =========================================================
        // 2. EXPAND EVENT NODE: Show all connected Objects
        // =========================================================
        else if (node.type === 'event') {
            const rawEvent = (data.events || []).find((evt: any) => evt.id.toString() === nodeId);
            if (!rawEvent || !rawEvent.relationships) return;

            const connectedRelationships = rawEvent.relationships;
            const totalRelationships = connectedRelationships.length;

            connectedRelationships.forEach((rel: any, index: number) => {
                const objId = rel.objectId.toString();
                let objNode = nodesRef.current.find((n) => n.id === objId);

                // Positioning parameters for radial layout (separate radius for clarity)
                const RADIUS = 70;
                const angle = (index / totalRelationships) * 2 * Math.PI;

                // Add Object Node if it doesn't exist
                if (!objNode) {
                    // Get object details from the object map in data
                    const objectDetails = data.objects ? data.objects[objId] : null;

                    objNode = {
                        id: objId,
                        label: objectDetails?.type || objId,
                        type: 'object',
                        x: node.x! + RADIUS * Math.cos(angle),
                        y: node.y! + RADIUS * Math.sin(angle),
                    };
                    nodesRef.current.push(objNode);
                    positionsRef.current.set(objId, { x: objNode.x, y: objNode.y });
                }

                // Add edge between event and object (if not already present)
                if (
                    !edgesRef.current.find(
                        (e) =>
                            (e.source.id === nodeId && e.target.id === objId) ||
                            (e.source.id === objId && e.target.id === nodeId)
                    )
                ) {
                    edgesRef.current.push({
                        id: `${nodeId}-${objId}`,
                        source: node,
                        target: objNode,
                        label: rel.qualifier || '',
                    });
                }

                newCollapsed.delete(objId);
            });
        }

        setCollapsedNodes(newCollapsed);
        setContextMenu(null);
        setUpdateFlag((prev) => prev + 1);
    };

    // const handleCollapse = (nodeId: string) => {
    //     const node = nodesRef.current.find((n) => n.id === nodeId);
    //     if (!node) return;

    //     const newCollapsed = new Set(collapsedNodes);
    //     newCollapsed.add(nodeId);

    //     // Optionally collapse immediate neighbors too
    //     getDanglingNeighbors(nodeId).forEach((n) => newCollapsed.add(n.id));

    //     setCollapsedNodes(newCollapsed);
    //     setContextMenu(null);
    // };

    const handleCollapse = (nodeId: string) => {
        const node = nodesRef.current.find((n) => n.id === nodeId);
        if (!node) return;

        const newCollapsed = new Set(collapsedNodes);

        // Find neighbors that only connect to this node (dangling nodes)
        const danglingNeighbors = getDanglingNeighbors(nodeId, edgesRef.current);

        // Add ONLY the dangling neighbors to the collapsed set (these will be hidden)
        danglingNeighbors.forEach((n) => newCollapsed.add(n.id));

        // Keep the clicked node's ID OUT of the collapsedNodes set!
        // We will use the presence of its *neighbors* in the set to color it grey in D3.

        setCollapsedNodes(newCollapsed);
        setContextMenu(null);

        // Force re-render to apply filtering and coloring changes
        setUpdateFlag((prev) => prev + 1);
    };

    // const toggleType = (type: string) => {
    //     setChunk(1);
    //     setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
    // };

    const toggleType = (type: string) => {
    setChunk(1);
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

    useEffect(() => {
        if (!data || !svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        svg.selectAll('*').remove();
        const g = svg.append('g');

        const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
            g.attr('transform', event.transform.toString());
            zoomTransformRef.current = event.transform;
        });
        svg.call(zoom as any);
        if (zoomTransformRef.current) svg.call(zoom.transform as any, zoomTransformRef.current);

        const events = data.events || [];
        const objects = data.objects || [];

        const filteredEvents = events.filter(
            (evt: any) => selectedTypes.length === 0 || selectedTypes.includes(evt.type)
        );
        const chunkedEvents = filteredEvents.slice(0, chunk * MAX_CHUNK);

        // Event nodes
        const eventNodes: NodeDatum[] = chunkedEvents.map((evt: any) => ({
            id: evt.id.toString(),
            label: evt.type || evt.activity || 'Event',
            type: 'event',
        }));

        // Object nodes
        const objectIds = new Set<string>();
        chunkedEvents.forEach((evt: any) =>
            (evt.relationships || []).forEach((rel: any) => objectIds.add(rel.objectId))
        );
        const objectNodes: NodeDatum[] = Array.from(objectIds).map((objId) => ({
            id: objId.toString(),
            label: objects[objId]?.type || objId,
            type: 'object',
        }));

        // Merge nodes (avoid duplicates)
        const existingNodeIds = new Set(nodesRef.current.map((n) => n.id));
        nodesRef.current = [
            ...nodesRef.current,
            ...objectNodes.filter((n) => !existingNodeIds.has(n.id)),
            ...eventNodes.filter((n) => !existingNodeIds.has(n.id)),
        ];

        // // Edges
        // edgesRef.current = chunkedEvents.flatMap((evt: any) =>
        //     (evt.relationships || []).map((rel: any, j: number) => ({
        //         id: `${evt.id}-${rel.objectId}-${j}`,
        //         source: nodesRef.current.find((n) => n.id === evt.id.toString())!,
        //         target: nodesRef.current.find((n) => n.id === rel.objectId.toString())!,
        //         label: rel.qualifier || '',
        //     }))
        // );

        // --- FIXED EDGE MERGING LOGIC --- //

        // Build fresh edges from chunked events
        const newEdges: EdgeDatum[] = [];

        chunkedEvents.forEach((evt: any) => {
            (evt.relationships || []).forEach((rel: any, idx: number) => {
                const evtId = evt.id.toString();
                const objId = rel.objectId.toString();

                const source = nodesRef.current.find((n) => n.id === evtId);
                const target = nodesRef.current.find((n) => n.id === objId);

                if (!source || !target) return;

                const edgeId = `${evtId}-${objId}-${idx}`;

                newEdges.push({
                    id: edgeId,
                    source,
                    target,
                    label: rel.qualifier || '',
                });
            });
        });

        // --- MERGE new edges with old edges (important for expand!) --- //
        const edgeMap = new Map<string, EdgeDatum>();

        // Keep existing edges created during EXPAND
        edgesRef.current.forEach((e) => edgeMap.set(e.id, e));

        // Add the newly calculated edges
        newEdges.forEach((e) => {
            if (!edgeMap.has(e.id)) {
                edgeMap.set(e.id, e);
            }
        });

        // Save merged edge list back
        edgesRef.current = Array.from(edgeMap.values());

        // Position nodes if not already positioned
        nodesRef.current.forEach((n) => {
            if (!positionsRef.current.has(n.id)) {
                let newX, newY, overlapping;
                do {
                    newX = width / 2 + Math.random() * 400 - 200;
                    newY = height / 2 + Math.random() * 400 - 200;
                    overlapping = Array.from(positionsRef.current.values()).some(
                        (p) => Math.hypot(p.x - newX, p.y - newY) < NODE_GAP
                    );
                } while (overlapping);
                n.x = newX;
                n.y = newY;
                positionsRef.current.set(n.id, { x: n.x, y: n.y });
            } else {
                const pos = positionsRef.current.get(n.id)!;
                n.x = pos.x;
                n.y = pos.y;
            }
        });

        // g.selectAll('line')
        //     .data(edgesRef.current)
        //     .enter()
        //     .append('line')
        //     .attr('stroke', (d) =>
        //         collapsedNodes.has(d.source.id) || collapsedNodes.has(d.target.id) ? '#b0b0b0' : 'black'
        //     )
        //     .attr('stroke-width', 1.8)
        //     .attr('x1', (d) => d.source.x!)
        //     .attr('y1', (d) => d.source.y!)
        //     .attr('x2', (d) => d.target.x!)
        //     .attr('y2', (d) => d.target.y!);

        // --- MODIFIED EDGE DRAWING CODE ---
        g.selectAll('line')
            .data(
                edgesRef.current.filter(
                    (d) =>
                        // Hide edge ONLY IF either end is a node in the collapsed set (hidden neighbor)
                        !collapsedNodes.has(d.source.id) && !collapsedNodes.has(d.target.id)
                )
            )
            .join('line') // Use join for efficient update/enter/exit handling
            .attr('stroke', 'black') // No need for conditional color; it's either visible or hidden
            .attr('stroke-width', 1.8)
            .attr('x1', (d) => d.source.x!)
            .attr('y1', (d) => d.source.y!)
            .attr('x2', (d) => d.target.x!)
            .attr('y2', (d) => d.target.y!);
        // ---

        // const nodeGroup = g
        //     .selectAll<SVGGElement, NodeDatum>('g.node')
        //     .data(nodesRef.current)
        //     .enter()
        //     .append('g')
        //     .attr('class', 'node')
        //     .attr('transform', (d) => `translate(${d.x},${d.y})`)
        //     .call(d3.drag<SVGGElement, NodeDatum>().on('start', dragstarted).on('drag', dragged).on('end', dragended));

        // nodeGroup
        //     .append('circle')
        //     .attr('r', NODE_RADIUS)
        //     .attr('fill', (d) => (collapsedNodes.has(d.id) ? 'lightgray' : d.type === 'event' ? 'orange' : 'steelblue'))

        // --- MODIFIED NODE DRAWING CODE ---
        // const nodeData = nodesRef.current.filter(d => !collapsedNodes.has(d.id));
        // const nodeGroup = g
        //     .selectAll<SVGGElement, NodeDatum>('g.node')
        //     .data(
        //         nodesRef.current.filter(
        //             (d) =>
        //                 // Keep the node ONLY IF it is NOT collapsed
        //                 !collapsedNodes.has(d.id)
        //         ),
        //         (d) => d.id
        //     ) // Use a key function (d => d.id) for stable selection
        //     .join('g') // Use join for efficient update/enter/exit handling
        //     .attr('class', 'node')
        //     .attr('transform', (d) => `translate(${d.x},${d.y})`)
        //     .call(d3.drag<SVGGElement, NodeDatum>().on('start', dragstarted).on('drag', dragged).on('end', dragended));

        // // The rest of the node styling (circle, label) goes here:

        // nodeGroup
        //     .append('circle')
        //     .attr('r', NODE_RADIUS)
        //     .attr('fill', (d) => (d.type === 'event' ? 'orange' : 'steelblue')) // Conditional color removed as collapsed state is filtered
        //     // ... rest of the styling and event handlers ...
        //     .attr('stroke', '#fff')
        //     .attr('stroke-width', 1.5)
        //     .style('cursor', 'pointer')
        //     .on('click', (event, d) => {
        //         event.stopPropagation();
        //         const [x, y] = d3.pointer(event, svgRef.current);
        //         setContextMenu({ x, y, node: d });
        //     });

        // --- MODIFIED NODE DRAWING ---

        // 💡 IMPORTANT: Filter out the nodes that should be completely hidden (the dangling neighbors)
        const nodeData = nodesRef.current.filter((d) => !collapsedNodes.has(d.id));

        const nodeGroup = g
            .selectAll<SVGGElement, NodeDatum>('g.node')
            .data(nodeData, (d) => d.id) // Key function ensures stable updates
            .join(
                (enter) => enter.append('g').attr('class', 'node'),
                (update) => update,
                (exit) => exit.remove()
            )
            .attr('transform', (d) => `translate(${d.x},${d.y})`)
            .call(d3.drag<SVGGElement, NodeDatum>().on('start', dragstarted).on('drag', dragged).on('end', dragended));

        // 1. Remove old circles and text to redraw with new colors/content
        nodeGroup.selectAll('circle').remove();
        nodeGroup.selectAll('text').remove();

        // 2. Redraw Circle with Conditional Coloring
        nodeGroup
            .append('circle')
            .attr('r', NODE_RADIUS)
            .attr('fill', (d) => {
                // Check if THIS node (d) has any immediate neighbors that are currently collapsed (hidden)
                const hasHiddenNeighbors = getDanglingNeighbors(d.id, edgesRef.current).some((n) =>
                    collapsedNodes.has(n.id)
                );

                if (hasHiddenNeighbors) {
                    // 💡 If it triggered the collapse, color it gray
                    return 'lightgray';
                }

                // Otherwise, use the standard color (orange for event, steelblue for object)
                return d.type === 'event' ? 'orange' : 'steelblue';
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                const [x, y] = d3.pointer(event, svgRef.current);
                setContextMenu({ x, y, node: d });
            });

        // 3. Redraw Labels (Your original label logic is complex, assuming you put it back here)
        // ... label drawing logic should be inserted here using nodeGroup.each(...)

        // Labels
        nodeGroup.each(function (d) {
            const group = d3.select(this);
            const words = d.label.split(/[\s_]+|(?=[A-Z])/g);
            const lineHeight = 8;
            const maxLines = 3;
            const wrapped: string[] = [];
            let line = '';
            words.forEach((w) => {
                if ((line + ' ' + w).length < 10) line += ' ' + w;
                else {
                    wrapped.push(line.trim());
                    line = w;
                }
            });
            wrapped.push(line.trim());
            const finalLines = wrapped.length > maxLines ? [...wrapped.slice(0, maxLines - 1), '...'] : wrapped;

            const text = group
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', 8)
                .attr('font-weight', '600')
                .attr('fill', 'white')
                .attr('pointer-events', 'none');

            const offset = (finalLines.length - 1) * -lineHeight * 0.5;
            text.selectAll('tspan')
                .data(finalLines)
                .enter()
                .append('tspan')
                .attr('x', 0)
                .attr('y', (_, i) => offset + i * lineHeight)
                .text((t) => t);
        });

        // Drag behavior
        function dragstarted(event: any, d: any) {
            d.fx = d.x;
            d.fy = d.y;
        }
        function dragged(event: any, d: any) {
            d.x = event.x;
            d.y = event.y;
            positionsRef.current.set(d.id, { x: d.x, y: d.y });
            d3.select(this).attr('transform', `translate(${d.x},${d.y})`);
            g.selectAll('line')
                .attr('x1', (d: any) => d.source.x!)
                .attr('y1', (d: any) => d.source.y!)
                .attr('x2', (d: any) => d.target.x!)
                .attr('y2', (d: any) => d.target.y!);
        }
        function dragended(event: any, d: any) {
            d.fx = null;
            d.fy = null;
        }
    }, [data, chunk, selectedTypes, collapsedNodes, updateFlag]);

    useEffect(() => {
        if (!data) return;
        const tooltip = d3
            .select('body')
            .append('div')
            .attr('class', 'd3-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0,0,0,0.7)')
            .style('color', 'white')
            .style('padding', '6px 10px')
            .style('border-radius', '6px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0);

        const createHistogram = (ref: SVGSVGElement, dataArr: [string, number][], fillColor: string) => {
            const svg = d3.select(ref);
            svg.selectAll('*').remove();
            const width = svg.node()?.clientWidth || 250;
            const height = svg.node()?.clientHeight || 200;
            const margin = { top: 20, right: 20, bottom: 50, left: 40 };
            const x = d3
                .scaleBand()
                .domain(dataArr.map(([k]) => k))
                .range([margin.left, width - margin.right])
                .padding(0.2);
            const y = d3
                .scaleLinear()
                .domain([0, d3.max(dataArr, ([, v]) => v)!])
                .nice()
                .range([height - margin.bottom, margin.top]);

            svg.append('g')
                .selectAll('rect')
                .data(dataArr)
                .enter()
                .append('rect')
                .attr('x', ([k]) => x(k)!)
                .attr('y', ([, v]) => y(v))
                .attr('width', x.bandwidth())
                .attr('height', ([, v]) => y(0) - y(v))
                .attr('fill', fillColor)
                .on('mouseover', (event, [, v]) => tooltip.style('opacity', 1).html(`<strong>Count:</strong> ${v}`))
                .on('mousemove', (event) =>
                    tooltip.style('left', event.pageX + 10 + 'px').style('top', event.pageY - 20 + 'px')
                )
                .on('mouseout', () => tooltip.style('opacity', 0));

            svg.append('g')
                .attr('transform', `translate(0,${height - margin.bottom})`)
                .call(d3.axisBottom(x))
                .selectAll('text')
                .attr('transform', 'rotate(-35)')
                .style('text-anchor', 'end')
                .attr('font-size', 9);

            svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y));
        };

        const activityCounts = d3.rollups(
            data.events || [],
            (v) => v.length,
            (d) => d.type || d.activity || 'Unknown'
        );
        const typeCounts = d3.rollups(
            Object.values(data.objects || {}),
            (v: any) => v.length,
            (d: any) => d.type || 'Unknown'
        );

        if (eventsChartRef.current) createHistogram(eventsChartRef.current, activityCounts, 'orange');
        if (objectsChartRef.current) createHistogram(objectsChartRef.current, typeCounts, 'steelblue');

        return () => tooltip.remove();
    }, [data]);

    if (!fileId) return <p>No File selected</p>;
    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error loading OCEL data</p>;
    if (!data) return <p>No data available</p>;

    return (
        <div className="flex flex-col h-screen bg-gray-50 relative">
            {contextMenu && (
                <div
                    className="absolute bg-white border border-gray-300 shadow-lg rounded-md text-sm z-50"
                    style={{ left: contextMenu.x + 20, top: contextMenu.y }}
                >
                    <button
                        className="block w-full text-left px-3 py-1 hover:bg-gray-100"
                        onClick={() => handleCollapse(contextMenu.node.id)}
                    >
                        Collapse Connected
                    </button>
                    <button
                        className="block w-full text-left px-3 py-1 hover:bg-gray-100"
                        onClick={() => handleExpand(contextMenu.node.id)}
                    >
                        Expand Connected
                    </button>
                </div>
            )}

            <div className="border-b border-gray-200 p-4 bg-white shadow-sm flex flex-wrap gap-3">
                <h2 className="font-bold text-gray-700">Filter by Event Type:</h2>
                {data.eventTypes?.map((type: any, idx: number) => {
                    const typeName = typeof type === 'string' ? type : type.name;
                    return (
                        <div key={idx} className="flex items-center space-x-2">
                            <Checkbox
                                id={`type-${idx}`}
                                checked={selectedTypes.includes(typeName)}
                                onCheckedChange={() => toggleType(typeName)}
                            />
                            <label htmlFor={`type-${idx}`} className="text-sm font-medium leading-none">
                                {typeName}
                            </label>
                        </div>
                    );
                })}
            </div>


            <div className="grid grid-cols-4 gap-4 p-4 overflow-auto">
                <div className="col-span-3 bg-white rounded-xl shadow p-3 relative">
                    <h3 className="font-semibold mb-2 text-center text-gray-700">Event–Object Relationship Graph</h3>
                    <svg ref={svgRef} className="w-full h-[600px] border rounded-lg bg-gray-50" />
                    {chunk * MAX_CHUNK < (data.events?.length || 0) && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                            <button
                                onClick={() => setChunk((prev) => prev + 1)}
                                className="px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600"
                            >
                                Load More Events ({chunk * MAX_CHUNK}/{data.events.length})
                            </button>
                        </div>
                    )}
                </div>

                <div className="col-span-1 flex flex-col gap-4">
                    <div className="bg-white rounded-xl shadow p-3">
                        <h3 className="font-semibold mb-2 text-center text-gray-700">Events per Activity</h3>
                        <svg ref={eventsChartRef} className="w-full h-[250px]" />
                    </div>
                    <div className="bg-white rounded-xl shadow p-3">
                        <h3 className="font-semibold mb-2 text-center text-gray-700">Objects per Type</h3>
                        <svg ref={objectsChartRef} className="w-full h-[250px]" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OcelVisualization;
