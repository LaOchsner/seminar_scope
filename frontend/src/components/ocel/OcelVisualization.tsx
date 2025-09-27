import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useSearchParams } from 'react-router-dom';
import { Checkbox } from '~/components/ui/checkbox';
import { useGetOcel } from '~/services/queries';

type NodeDatum = {
    id: string;
    label: string;
    type: 'event' | 'object';
    x: number;
    y: number;
};

type EdgeDatum = {
    id: string;
    source: string;
    target: string;
    label: string;
};

const MAX_CHUNK = 500;

const OcelVisualizationD3 = () => {
    const [params] = useSearchParams();
    const fileId = params.get('fileId');
    const { data, isLoading, error } = useGetOcel(fileId || '');

    const svgRef = useRef<SVGSVGElement | null>(null);

    const [chunk, setChunk] = useState(1);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

    useEffect(() => {
        if (!data || !svgRef.current) return;

        const events = data.events || [];
        const objects = data.objects || [];

        const filteredEvents = events.filter(
            (evt: any) => selectedTypes.length === 0 || selectedTypes.includes(evt.type)
        );
        const chunkedEvents = filteredEvents.slice(0, chunk * MAX_CHUNK);

        const eventNodes: NodeDatum[] = chunkedEvents.map((evt: any, i: number) => ({
            id: evt.id.toString(),
            label: evt.type || evt.activity || 'Event',
            type: 'event',
            x: (i % 20) * 70,
            y: Math.floor(i / 20) * 80,
        }));

        const objectIds = new Set<string>();
        chunkedEvents.forEach((evt: any) => {
            (evt.relationships || []).forEach((rel: any) => objectIds.add(rel.objectId));
        });

        const objectNodes: NodeDatum[] = Array.from(objectIds).map((objId, i) => ({
            id: objId.toString(),
            label: objects[objId]?.type || objId,
            type: 'object',
            x: (i % 20) * 70,
            y: 600 + Math.floor(i / 20) * 80,
        }));

        const nodes: NodeDatum[] = [...eventNodes, ...objectNodes];
        const nodeMap = new Map(nodes.map((n) => [n.id, n]));

        const edges: EdgeDatum[] = chunkedEvents.flatMap((evt: any, i: number) =>
            (evt.relationships || []).map((rel: any, j: number) => ({
                id: `${evt.id}-${rel.objectId}-${j}`,
                source: evt.id.toString(),
                target: rel.objectId.toString(),
                label: rel.qualifier || '',
            }))
        );

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        const g = svg.append('g');

        g.selectAll('line')
            .data(edges)
            .enter()
            .append('line')
            .attr('x1', (d) => nodeMap.get(d.source)?.x || 0)
            .attr('y1', (d) => nodeMap.get(d.source)?.y || 0)
            .attr('x2', (d) => nodeMap.get(d.target)?.x || 0)
            .attr('y2', (d) => nodeMap.get(d.target)?.y || 0)
            .attr('stroke', '#999');

        g.selectAll('text.edge-label')
            .data(edges)
            .enter()
            .append('text')
            .attr('class', 'edge-label')
            .attr('x', (d) => ((nodeMap.get(d.source)?.x || 0) + (nodeMap.get(d.target)?.x || 0)) / 2)
            .attr('y', (d) => ((nodeMap.get(d.source)?.y || 0) + (nodeMap.get(d.target)?.y || 0)) / 2)
            .attr('font-size', 8)
            .attr('fill', '#333')
            .text((d) => d.label);

        const nodeGroup = g
            .selectAll('g.node')
            .data(nodes)
            .enter()
            .append('g')
            .attr('transform', (d) => `translate(${d.x},${d.y})`);

        nodeGroup
            .append('circle')
            .attr('r', 16)
            .attr('fill', (d) => (d.type === 'event' ? '#f59e0b' : '#3b82f6'));

        nodeGroup
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', 5)
            .attr('fill', 'white')
            .attr('font-size', 10)
            .text((d) => d.label);

        const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
            g.attr('transform', event.transform.toString());
        });
        svg.call(zoom as any);
    }, [data, chunk, selectedTypes]);

    if (!fileId) return <p>No File selected</p>;
    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error loading OCEL data</p>;
    if (!data) return <p>No data available</p>;

    const toggleType = (type: string) => {
        setChunk(1);
        setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
    };

    return (
        <div className="flex h-[90vh]">
            <div className="w-64 border-r border-gray-300 p-4 overflow-y-auto">
                <h2 className="font-bold mb-2">Filter by Event Type</h2>
                {data.eventTypes?.map((type: any, idx: number) => {
                    const typeName = typeof type === 'string' ? type : type.name;
                    return (
                        <div key={idx} className="flex items-center gap-2 mb-2">
                            <Checkbox
                                checked={selectedTypes.includes(typeName)}
                                onCheckedChange={() => toggleType(typeName)}
                            />
                            <span>{typeName}</span>
                        </div>
                    );
                })}
            </div>

            <div className="flex-1 relative">
                <svg ref={svgRef} width="100%" height="100%"></svg>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    {chunk * MAX_CHUNK < (data.events?.length || 0) && (
                        <button
                            onClick={() => setChunk((prev) => prev + 1)}
                            className="px-4 py-2 bg-blue-500 text-white rounded"
                        >
                            Load More Events ({chunk * MAX_CHUNK}/{data.events.length})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OcelVisualizationD3;
