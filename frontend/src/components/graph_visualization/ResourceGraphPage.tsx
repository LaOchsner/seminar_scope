// import React, { useEffect, useRef, useState } from 'react';
// import * as d3 from 'd3';
// import { MousePointer } from 'lucide-react';
// import LegendRect from '~/components/ocpt/ui/LegendRect';
// import { useGetLogGraphs } from '~/services/queries';
// import { getDeterministicColor } from '~/lib/colors';
// import { useParams } from 'react-router-dom';
// import { SidebarProvider } from '~/components/ui/sidebar';
// import BreadcrumbNav from '~/components/BreadcrumbNav';
// import OcelVisualization from '~/components/graph_visualization/OcelVisualization';
// import { useExploreFlowStore } from '~/stores/exploreStore';
// import { assetTypeToNodeType } from '~/lib/explore/exploreNodes.utils';
// import { VisualizationExploreNodeData } from '~/types/explore/nodeData/visualizationNodeData';
// import { ExploreFileNodeType } from '~/types/explore/nodeTypesCategories';
// const ResourceGraphPage: React.FC = () => {
//     const [fileId, setFileId] = useState<string | null>(null);
//     const [sourceType, setSourceType] =
//         useState<Extract<ExploreFileNodeType, 'ocelFileNode' | 'ocelCollectionNode'>>('ocelFileNode');
//     const { nodeId } = useParams<{ nodeId: string }>();
//     const { getNode } = useExploreFlowStore();
//      const containerRef = useRef<HTMLDivElement | null>(null);
//         const svgRef = useRef<SVGSVGElement | null>(null);
//         const { getColorForObject } = useExploreFlowStore();
//         // const { data, isLoading, error } = useGetLogGraphs(fileId);
//         const data={
//             event_types: ['apple','ball','cat'],
//             object_types: ['a','b','c'],
//             arcs: [ {source_type: "a", target_type: "apple" },
//                 {source_type: "b", target_type: "ball"},
//                 {source_type: "c", target_type: "cat"}
//             ],
//         };
//         const [localGraph, setLocalGraph] = useState<any | null>(null);
//     // Restore the saved flow from localStorage
//     useEffect(() => {
//         const nodes: any[] = [];
//         const links: any[] = [];
//         data.event_types.forEach((et: string) =>
//             nodes.push({
//                 id: et,
//                 group: 'event',
//             })
//         );
//         data.object_types.forEach((ot: string) =>
//             nodes.push({
//                 id: ot,
//                 group: 'object',
//             })
//         );
//   data.arcs.forEach((a: any) => {
//                 // const link = {
//                 //     source: a.source_type,
//                 //     target: a.target_type,
//                 // };
//          links.push({
//             source: a.source_type,
//                     target: a.target_type
//                 });
//             });
//         setLocalGraph({ nodes, links });
//     }, [data]);
//     // Extract the fileId from the node
//     useEffect(() => {
//         // if (!nodeId) return;
//         // const node = getNode(nodeId);
//         // if (!node) {
//         //     console.warn(` Node with ID ${nodeId} not found.`);
//         //     return;
//         // }
//         // const nodeData = node.data as VisualizationExploreNodeData;
//         // console.dir(node, { depth: null });
//         // console.log('Node found:', node);
//         // if (nodeData?.assets?.length > 0) {
//         //     const firstAsset = nodeData.assets[0];
//         //     console.log('Extracted file ID from assets:', firstAsset.id);
//         //     setFileId(firstAsset.id);
//         //     const nodeType = assetTypeToNodeType(firstAsset.type);
//         //     if (nodeType === 'ocelCollectionNode' || nodeType === 'ocelFileNode') {
//         //         setSourceType(nodeType);
//         //     }
//         // } else {
//         //     console.warn('No assets found in node data.');
//         // }
//   if (!localGraph || !svgRef.current || !containerRef.current) return;
//         const svg = d3.select(svgRef.current);
//         svg.selectAll('*').remove();
//         const width = containerRef.current.clientWidth;
//         const height = containerRef.current.clientHeight;
//         const g = svg.attr('viewBox', `0 0 ${width} ${height}`).append('g');
//         svg.call(
//             d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
//                 g.attr('transform', event.transform);
//             })
//         );
//         const simulation = d3
//             .forceSimulation(localGraph.nodes)
//             .force(
//                 'link',
//                 d3
//                     .forceLink(localGraph.links)
//                     .id((d: any) => d.id)
//                     .distance(160)
//             )
//             .force('charge', d3.forceManyBody().strength(-350))
//             .force('center', d3.forceCenter(width / 2, height / 2))
//             .force('collision', d3.forceCollide().radius(45));
//         const link = g
//             .append('g')
//             .selectAll('line')
//             .data(localGraph.links)
//             .enter()
//             .append('line')
//             .attr('stroke-width', 3);
//             const node = g
//             .append('g')
//             .selectAll('circle')
//             .data(localGraph.nodes)
//             .enter()
//             .append('circle')
//             .attr('r', 12)
//             .attr('fill', (d: any) =>
//                 'white'
//             )
//             .attr('stroke', 'black')
//             .attr('stroke-width', 2)
//             .call(
//                 d3
//                     .drag<SVGCircleElement, any>()
//                     .on('start', (event, d) => {
//                         if (!event.active) simulation.alphaTarget(0.3).restart();
//                         d.fx = d.x;
//                         d.fy = d.y;
//                     })
//                     .on('drag', (event, d) => {
//                         d.fx = event.x;
//                         d.fy = event.y;
//                     })
//                     .on('end', (event, d) => {
//                         if (!event.active) simulation.alphaTarget(0);
//                         d.fx = null;
//                         d.fy = null;
//                     })
//             );
//              const label = g
//             .append('g')
//             .selectAll('text')
//             .data(localGraph.nodes)
//             .enter()
//             .append('text')
//             .text((d: any) => d.id)
//             .attr('font-size', 10)
//             .attr('dy', -18)
//             .attr('text-anchor', 'middle');
//  simulation.on('tick', () => {
//             link.attr('x1', (d: any) => d.source.x)
//                 .attr('y1', (d: any) => d.source.y)
//                 .attr('x2', (d: any) => d.target.x)
//                 .attr('y2', (d: any) => d.target.y);
//             node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
//             label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
//         });
//     }, [nodeId, getNode  , localGraph,  fileId, getColorForObject]);
//     //  if (isLoading) return <div className="flex w-full h-full justify-center items-center">Loading graph...</div>;
//     // if (error)
//     //     return <div className="flex w-full h-full justify-center items-center text-red-500">Failed to load graph</div>;
//     return (
//         <div className="w-full h-full p-2">
//             <div ref={containerRef} className="w-full h-full">
//                 <svg ref={svgRef} className="w-full h-full" />
//             </div>
//         </div>
//     );
// };
// export default ResourceGraphPage;
import React, { useState } from 'react';
import { Group } from '@visx/group';
import { Circle, Line } from '@visx/shape';
import { Text } from '@visx/text';
import { useGetActivityResource } from '~/services/queries';

const width = 1100;
const height = 700;

// const data = {
//     object_type_not_resource: ['orders', 'employees', 'packages','items'],
//     object_resource: ['products', 'items', 'customers'],
//     event_types_without_object_resource: ['failed delivery', 'send package', 'place order'],
//     object_not_resource_arcs: [
//         { source_type: 'orders', target_type: 'failed delivery' },
//         { source_type: 'employees', target_type: 'send package' },
//         { source_type: 'packages', target_type: 'place order' },
//         { source_type: 'items', target_type: 'place order' },
//     ],
//     special_activity: ['item out of stock', 'create package', 'package delivered'],
// };

type NodeType = 'object_type_not_resource' | 'object_resource' | 'event_types_without_object_resource' | 'special_activity';

type GraphNode = {
    id: string;
    label: string;
    x: number;
    y: number;
    type: NodeType;
};

const ResourceGraphPage: React.FC = () => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const spacing = 250;
    const nodes: GraphNode[] = [];
    console.log('data11');
 const {
  data: resourceData,
  isLoading,
  error,
} = useGetActivityResource('94fe8842-b741-49e0-85db-693824bc3442');

if (isLoading) {
  return <div>Loading...</div>;
}

if (error) {
  return <div>Error loading data</div>;
}

if (!resourceData) {
  return <div>No data found</div>;
}

const data = resourceData;
console.log('data11');
console.log(data.special_activity);

// Now this is safe
data.object_resource.forEach((event: any, index: number) => {
  nodes.push({
    id: event,
    label: event,
    x: 150 + index * spacing,
    y: 100,
    type: 'object_resource',
  });
});
    // Object nodes (middle)
    data.object_type_not_resource.forEach((obj: any, index : any) => {
        nodes.push({
            id: obj,
            label: obj,
            x: 150 + index * spacing,
            y: 300,
            type: 'object_type_not_resource',
        });
    });

    // Event WITHOUT object resource (lower)
    data.event_types_without_object_resource.forEach((event : any, index : any) => {
        nodes.push({
            id: event,
            label: event,
            x: 150 + index * spacing,
            y: 500,
            type: 'event_types_without_object_resource',
        });
    });

    // Special Activity (bottom)
    data.special_activity.forEach((activity: any, index: any) => {
        nodes.push({
            id: activity,
            label: activity,
            x: 150 + index * spacing,
            y: 620,
            type: 'special_activity',
        });
    });

    const getNode = (id: string) => nodes.find((n) => n.id === id);

    return (
        <div style={{ width: '100%', height: '100vh' }}>
            <svg width={width} height={height}>
                {/* Arrow Definition */}
                <defs>
                    <marker
                        id="arrow"
                        markerWidth="10"
                        markerHeight="10"
                        refX="10"
                        refY="3"
                        orient="auto"
                        markerUnits="strokeWidth"
                    >
                        <path d="M0,0 L0,6 L9,3 z" fill="#555" />
                    </marker>
                </defs>

                {/* Edges */}
                {data.object_not_resource_arcs.map((arc: any, index: any) => {
                    const source = getNode(arc.source_type);
                    const target = getNode(arc.target_type);
                    if (!source || !target) return null;

                    return (
                        <Line
                            key={index}
                            from={{ x: source.x, y: source.y + 30 }}
                            to={{ x: target.x, y: target.y - 30 }}
                            stroke="#555"
                            strokeWidth={2}
                            markerEnd="url(#arrow)"
                        />
                    );
                })}

                {/* Nodes */}
                {nodes.map((node) => {
                    let fillColor = '#2196F3';
                    if (node.type === 'object_resource') fillColor = '#4CAF50';
                    if (node.type === 'object_type_not_resource') fillColor = '#FF9800';
                    if (node.type === 'special_activity') fillColor = '#9C27B0';

                    return (
                        <Group key={node.id}>
                            {node.type === 'special_activity' || node.type === 'event_types_without_object_resource' ? (
                                <>
                                    {/* Special Activity as Rectangle */}
                                    <rect
                                        x={node.x - 60}
                                        y={node.y - 25}
                                        width={120}
                                        height={50}
                                        rx={10}
                                        fill={fillColor}
                                        stroke="#333"
                                        strokeWidth={2}
                                        onClick={() => setActiveMenu(activeMenu === node.id ? null : node.id)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <Text
                                        x={node.x}
                                        y={node.y}
                                        textAnchor="middle"
                                        verticalAnchor="middle"
                                        fill="white"
                                        fontSize={12}
                                    >
                                        {node.label}
                                    </Text>

                                    {/* Popup Menu */}
                                    {activeMenu === node.id && (
                                        <Group>
                                            <rect
                                                x={node.x - 70}
                                                y={node.y + 35}
                                                width={140}
                                                height={70}
                                                fill="white"
                                                stroke="#999"
                                                rx={8}
                                            />
                                            <Text
                                                x={node.x}
                                                y={node.y + 60}
                                                textAnchor="middle"
                                                fill="black"
                                                fontSize={12}
                                            >
                                                View Details
                                            </Text>
                                            <Text
                                                x={node.x}
                                                y={node.y + 80}
                                                textAnchor="middle"
                                                fill="black"
                                                fontSize={12}
                                            >
                                                Trigger Action
                                            </Text>
                                        </Group>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Circle
                                        cx={node.x}
                                        cy={node.y}
                                        r={30}
                                        fill={fillColor}
                                        stroke="#333"
                                        strokeWidth={2}
                                    />
                                    <Text
                                        x={node.x}
                                        y={node.y}
                                        textAnchor="middle"
                                        verticalAnchor="middle"
                                        fill="white"
                                        fontSize={12}
                                    >
                                        {node.label}
                                    </Text>
                                </>
                            )}
                        </Group>
                    );
                })}
            </svg>
        </div>
    );
};

export default ResourceGraphPage;