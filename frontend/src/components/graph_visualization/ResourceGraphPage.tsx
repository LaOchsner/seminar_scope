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
    const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

    const { data: resourceData, isLoading, error } = useGetActivityResource('9556a186-4429-4515-b116-58e10e155abe');

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error loading data</div>;
    if (!resourceData) return <div>No data found</div>;

    const data = resourceData;

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
    console.log('selectedActivities');
    console.log(selectedActivities.length);

    data.object_resource.forEach((item: string, i: number) => {
        nodes.push({
            id: item,
            label: item,
            x: spacing * (i + 1),
            y: 100,
            type: 'object_resource',
        });
    });

    data.object_type_not_resource.forEach((item: string, i: number) => {
        nodes.push({
            id: item,
            label: item,
            x: spacing * (i + 1),
            y: 300,
            type: 'object_type_not_resource',
        });
    });

    data.non_special_event_types.forEach((item: string, i: number) => {
        nodes.push({
            id: item,
            label: item,
            x: spacing * (i + 1),
            y: 500,
            type: 'event_types_without_object_resource',
        });
    });

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

    const toggleSelection = (id: string) => {
        setSelectedActivities((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const handleRun = async () => {
        try {
            const response = await fetch('/api/run-special-activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activities: selectedActivities }),
            });

            if (!response.ok) throw new Error('Failed to run');

            const result = await response.json();
            console.log('Success:', result);

            setSelectedActivities([]);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
            <Zoom width={width} height={height} scaleXMin={0.5} scaleXMax={4} scaleYMin={0.5} scaleYMax={4}>
                {(zoom) => (
                    <>
                        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                            <button onClick={zoom.reset}>Reset</button>
                        </div>

                        {selectedActivities.length > 0 && (
                            <div
                                style={{
                                    position: 'fixed',
                                    bottom: 20,
                                    right: 20,
                                    zIndex: 9999,
                                    background: '#fff',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                                }}
                            >
                                <button onClick={handleRun}>Fix ({selectedActivities.length})</button>
                            </div>
                        )}

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

                                {nodes.map((node) => {
                                    let fillColor = '#2196F3';
                                    if (node.type === 'object_resource') fillColor = '#4CAF50';
                                    if (node.type === 'object_type_not_resource') fillColor = '#FF9800';
                                    if (node.type === 'special_activity') fillColor = '#9C27B0';

                                    const isSelected = selectedActivities.includes(node.id);

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
                                                        fill={
                                                            node.type === 'special_activity' && isSelected
                                                                ? 'grey'
                                                                : fillColor
                                                        }
                                                        stroke={isSelected ? '#000' : '#333'}
                                                        strokeWidth={isSelected ? 3 : 2}
                                                        onClick={() => {
                                                            if (node.type === 'special_activity') {
                                                                toggleSelection(node.id);
                                                            }
                                                        }}
                                                        style={{
                                                            cursor:
                                                                node.type === 'special_activity'
                                                                    ? 'pointer'
                                                                    : 'default',
                                                        }}
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
