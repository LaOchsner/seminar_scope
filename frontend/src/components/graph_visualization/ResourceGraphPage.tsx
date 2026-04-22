// import React, { useState } from 'react';
// import { Group } from '@visx/group';
// import { Circle, Line } from '@visx/shape';
// import { Text } from '@visx/text';
// import { useGetActivityResource } from '~/services/queries';



// // const data = {
// //     object_type_not_resource: ['orders', 'employees', 'packages','items'],
// //     object_resource: ['products', 'items', 'customers'],
// //     event_types_without_object_resource: ['failed delivery', 'send package', 'place order'],
// //     object_not_resource_arcs: [
// //         { source_type: 'orders', target_type: 'failed delivery' },
// //         { source_type: 'employees', target_type: 'send package' },
// //         { source_type: 'packages', target_type: 'place order' },
// //         { source_type: 'items', target_type: 'place order' },
// //     ],
// //     special_activity: ['item out of stock', 'create package', 'package delivered'],
// // };

// type NodeType = 'object_type_not_resource' | 'object_resource' | 'event_types_without_object_resource'|'non_special_event_types' | 'special_activity';

// type GraphNode = {
//     id: string;
//     label: string;
//     x: number;
//     y: number;
//     type: NodeType;
// };

// const ResourceGraphPage: React.FC = () => {
//     const [activeMenu, setActiveMenu] = useState<string | null>(null);

//     const spacing = 250;
//     const nodes: GraphNode[] = [];
//     console.log('data11');
//  const {
//   data: resourceData,
//   isLoading,
//   error,
// } = useGetActivityResource('a1172f6f-bb0b-419d-b204-ba5be3eb116e');

// if (isLoading) {
//   return <div>Loading...</div>;
// }

// if (error) {
//   return <div>Error loading data</div>;
// }

// if (!resourceData) {
//   return <div>No data found</div>;
// }

// const data = resourceData;
// console.log('data11');
// console.log(data.special_activity);

// // Now this is safe
// data.object_resource.forEach((event: any, index: number) => {
//   nodes.push({
//     id: event,
//     label: event,
//     x: 150 + index * spacing,
//     y: 100,
//     type: 'object_resource',
//   });
// });
//     // Object nodes (middle)
//     data.object_type_not_resource.forEach((obj: any, index : any) => {
//         nodes.push({
//             id: obj,
//             label: obj,
//             x: 150 + index * spacing,
//             y: 300,
//             type: 'object_type_not_resource',
//         });
//     });

//     // Event WITHOUT object resource (lower)
//     data.non_special_event_types.forEach((event : any, index : any) => {
//         nodes.push({
//             id: event,
//             label: event,
//             x: 150 + index * spacing,
//             y: 500,
//             type: 'event_types_without_object_resource',
//         });
//     });

//     // Special Activity (bottom)
//     data.special_activity.forEach((activity: any, index: any) => {
//         nodes.push({
//             id: activity,
//             label: activity,
//             x: 150 + index * spacing,
//             y: 620,
//             type: 'special_activity',
//         });
//     });

//     const getNode = (id: string) => nodes.find((n) => n.id === id);

//     return (
//         <div style={{ width: '100%', height: '100vh' }}>
//             <svg width="100%"
//   height="100%"
//   viewBox={`0 0 ${width} ${height}`}
//   preserveAspectRatio="xMidYMid meet">
//                 <defs>
//                     <marker
//                         id="arrow"
//                         markerWidth="10"
//                         markerHeight="10"
//                         refX="10"
//                         refY="3"
//                         orient="auto"
//                         markerUnits="strokeWidth"
//                     >
//                         <path d="M0,0 L0,6 L9,3 z" fill="#555" />
//                     </marker>
//                 </defs>

//                 {/* Edges */}
//                 {data.object_not_resource_arcs.map((arc: any, index: any) => {
//                     const source = getNode(arc.source_type);
//                     const target = getNode(arc.target_type);
//                     if (!source || !target) return null;

//                     return (
//                         <Line
//                             key={index}
//                             from={{ x: source.x, y: source.y + 30 }}
//                             to={{ x: target.x, y: target.y - 30 }}
//                             stroke="#555"
//                             strokeWidth={2}
//                             markerEnd="url(#arrow)"
//                         />
//                     );
//                 })}

//                 {/* Nodes */}
//                 {nodes.map((node) => {
//                     let fillColor = '#2196F3';
//                     if (node.type === 'object_resource') fillColor = '#4CAF50';
//                     if (node.type === 'object_type_not_resource') fillColor = '#FF9800';
//                     if (node.type === 'special_activity') fillColor = '#9C27B0';

//                     return (
//                         <Group key={node.id}>
//                             {node.type === 'special_activity' || node.type === 'non_special_event_types' ? (
//                                 <>
//                                     {/* Special Activity as Rectangle */}
//                                     <rect
//                                         x={node.x - 60}
//                                         y={node.y - 25}
//                                         width={120}
//                                         height={50}
//                                         rx={10}
//                                         fill={fillColor}
//                                         stroke="#333"
//                                         strokeWidth={2}
//                                         onClick={() => setActiveMenu(activeMenu === node.id ? null : node.id)}
//                                         style={{ cursor: 'pointer' }}
//                                     />
//                                     <Text
//                                         x={node.x}
//                                         y={node.y}
//                                         textAnchor="middle"
//                                         verticalAnchor="middle"
//                                         fill="white"
//                                         fontSize={12}
//                                     >
//                                         {node.label}
//                                     </Text>

//                                     {/* Popup Menu */}
//                                     {activeMenu === node.id && (
//                                         <Group>
//                                             <rect
//                                                 x={node.x - 70}
//                                                 y={node.y + 35}
//                                                 width={140}
//                                                 height={70}
//                                                 fill="white"
//                                                 stroke="#999"
//                                                 rx={8}
//                                             />
//                                             <Text
//                                                 x={node.x}
//                                                 y={node.y + 60}
//                                                 textAnchor="middle"
//                                                 fill="black"
//                                                 fontSize={12}
//                                             >
//                                                 View Details
//                                             </Text>
//                                             <Text
//                                                 x={node.x}
//                                                 y={node.y + 80}
//                                                 textAnchor="middle"
//                                                 fill="black"
//                                                 fontSize={12}
//                                             >
//                                                 Trigger Action
//                                             </Text>
//                                         </Group>
//                                     )}
//                                 </>
//                             ) : (
//                                 <>
//                                     <Circle
//                                         cx={node.x}
//                                         cy={node.y}
//                                         r={30}
//                                         fill={fillColor}
//                                         stroke="#333"
//                                         strokeWidth={2}
//                                     />
//                                     <Text
//                                         x={node.x}
//                                         y={node.y}
//                                         textAnchor="middle"
//                                         verticalAnchor="middle"
//                                         fill="white"
//                                         fontSize={12}
//                                     >
//                                         {node.label}
//                                     </Text>
//                                 </>
//                             )}
//                         </Group>
//                     );
//                 })}
//             </svg>
//         </div>
//     );
// };

// export default ResourceGraphPage;






import React, { useState } from 'react';
import { Group } from '@visx/group';
import { Circle, Line } from '@visx/shape';
import { Text } from '@visx/text';
import { Zoom } from '@visx/zoom';
import { useGetActivityResource } from '~/services/queries';

type NodeType =
  | 'object_type_not_resource'
  | 'object_resource'
  | 'event_types_without_object_resource'
  | 'special_activity';

type GraphNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  type: NodeType;
};

const ResourceGraphPage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const {
    data: resourceData,
    isLoading,
    error,
  } = useGetActivityResource('a1172f6f-bb0b-419d-b204-ba5be3eb116e');

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;
  if (!resourceData) return <div>No data found</div>;

  const data = resourceData;

  // ✅ Dynamic layout calculation
  const maxNodes = Math.max(
    data.object_resource.length,
    data.object_type_not_resource.length,
    data.non_special_event_types.length,
    data.special_activity.length
  );

  const width = Math.max(1100, maxNodes * 200);
  const height = 700;
  const spacing = width / (maxNodes + 1);

  const nodes: GraphNode[] = [];

  // Top row
  data.object_resource.forEach((item: string, i: number) => {
    nodes.push({
      id: item,
      label: item,
      x: spacing * (i + 1),
      y: 100,
      type: 'object_resource',
    });
  });

  // Middle row
  data.object_type_not_resource.forEach((item: string, i: number) => {
    nodes.push({
      id: item,
      label: item,
      x: spacing * (i + 1),
      y: 300,
      type: 'object_type_not_resource',
    });
  });

  // Lower row
  data.non_special_event_types.forEach((item: string, i: number) => {
    nodes.push({
      id: item,
      label: item,
      x: spacing * (i + 1),
      y: 500,
      type: 'event_types_without_object_resource',
    });
  });

  // Bottom row
  data.special_activity.forEach((item: string, i: number) => {
    nodes.push({
      id: item,
      label: item,
      x: spacing * (i + 1),
      y: 620,
      type: 'special_activity',
    });
  });

  const getNode = (id: string) => nodes.find((n) => n.id === id);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Zoom
        width={width}
        height={height}
        scaleXMin={0.5}
        scaleXMax={4}
        scaleYMin={0.5}
        scaleYMax={4}
      >
        {(zoom) => (
          <>
            {/* 🔘 Reset Button */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
              <button onClick={zoom.reset}>Reset</button>
            </div>

            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${width} ${height}`}
              style={{ cursor: zoom.isDragging ? 'grabbing' : 'grab' }}
              onWheel={zoom.handleWheel}
              onMouseDown={zoom.dragStart}
              onMouseMove={zoom.dragMove}
              onMouseUp={zoom.dragEnd}
              onMouseLeave={zoom.dragEnd}
            >
              <g transform={zoom.toString()}>
                {/* Arrow */}
                <defs>
                  <marker
                    id="arrow"
                    markerWidth="10"
                    markerHeight="10"
                    refX="10"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L0,6 L9,3 z" fill="#555" />
                  </marker>
                </defs>

                {/* 🔗 Edges */}
                {data.object_not_resource_arcs.map((arc: any, i: number) => {
                  const source = getNode(arc.source_type);
                  const target = getNode(arc.target_type);
                  if (!source || !target) return null;

                  return (
                    <Line
                      key={i}
                      from={{ x: source.x, y: source.y + 30 }}
                      to={{ x: target.x, y: target.y - 30 }}
                      stroke="#555"
                      strokeWidth={2}
                      markerEnd="url(#arrow)"
                    />
                  );
                })}

                {/* 🔵 Nodes */}
                {nodes.map((node) => {
                  let fillColor = '#2196F3';
                  if (node.type === 'object_resource') fillColor = '#4CAF50';
                  if (node.type === 'object_type_not_resource') fillColor = '#FF9800';
                  if (node.type === 'special_activity') fillColor = '#9C27B0';

                  return (
                    <Group key={node.id}>
                      {node.type === 'special_activity' ||
                      node.type === 'event_types_without_object_resource' ? (
                        <>
                          <rect
                            x={node.x - 60}
                            y={node.y - 25}
                            width={120}
                            height={50}
                            rx={10}
                            fill={fillColor}
                            stroke="#333"
                            strokeWidth={2}
                            onClick={() =>
                              setActiveMenu(
                                activeMenu === node.id ? null : node.id
                              )
                            }
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

                          {/* Popup */}
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
              </g>
            </svg>
          </>
        )}
      </Zoom>
    </div>
  );
};

export default ResourceGraphPage;