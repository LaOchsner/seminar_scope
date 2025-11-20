
import { useState, useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { NodeDatum, EdgeDatum, ContextMenuState } from './types';
import { getDanglingNeighbors, getImmediateNeighbors } from './graphUtils';
import  OcelVisualization  from './OcelVisualization';


const MAX_CHUNK = 5;
const NODE_RADIUS = 20;

export const useGraphInteractions = (
    data: any,
    selectedTypes: string[],
    chunk: number,
    setChunk: React.Dispatch<React.SetStateAction<number>>,
    svgRef: React.RefObject<SVGSVGElement | null>
) => {
    
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
    const [updateFlag, setUpdateFlag] = useState(0); 

    const nodesRef = useRef<NodeDatum[]>([]);
    const edgesRef = useRef<EdgeDatum[]>([]);
    const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const zoomTransformRef = useRef<d3.ZoomTransform | null>(null);

  

    const handleCollapse = useCallback((nodeId: string) => {
        const node = nodesRef.current.find((n) => n.id === nodeId);
        if (!node) return;

        const newCollapsed = new Set(collapsedNodes);
        
     
        const danglingNeighbors = getDanglingNeighbors(nodeId, edgesRef.current);
        danglingNeighbors.forEach((n) => newCollapsed.add(n.id));

        setCollapsedNodes(newCollapsed);
        setContextMenu(null);
        setUpdateFlag((prev) => prev + 1);
    }, [collapsedNodes]);


    const handleExpand = useCallback((nodeId: string) => {
        const node = nodesRef.current.find((n) => n.id === nodeId);
        if (!node) return;

        const newCollapsed = new Set(collapsedNodes);
        newCollapsed.delete(nodeId); 

        const RADIUS = 70; 

        if (node.type === 'object') {
            const connectedEvents = (data.events || []).filter((evt: any) =>
                (evt.relationships || []).some((rel: any) => rel.objectId === nodeId)
            );
            const totalEvents = connectedEvents.length;

            connectedEvents.forEach((evt: any, index: number) => {
                const evtId = evt.id.toString();
                let evtNode = nodesRef.current.find((n) => n.id === evtId);
                const angle = (index / totalEvents) * 2 * Math.PI;

                if (!evtNode) {
                    evtNode = { id: evtId, label: evt.type || evt.activity || 'Event', type: 'event',
                        x: node.x! + RADIUS * Math.cos(angle), y: node.y! + RADIUS * Math.sin(angle),
                    };
                    nodesRef.current.push(evtNode);
                    positionsRef.current.set(evtId, { x: evtNode.x, y: evtNode.y });
                }

                const edgeExists = edgesRef.current.some((e) =>
                    (e.source.id === evtId && e.target.id === nodeId) || (e.source.id === nodeId && e.target.id === evtId)
                );
                if (!edgeExists) {
                    edgesRef.current.push({ id: `${evtId}-${nodeId}`, source: evtNode, target: node, label: '', });
                }
                newCollapsed.delete(evtId);
            });
        } else if (node.type === 'event') {
            const rawEvent = (data.events || []).find((evt: any) => evt.id.toString() === nodeId);
            if (!rawEvent || !rawEvent.relationships) return;

            const connectedRelationships = rawEvent.relationships;
            const totalRelationships = connectedRelationships.length;

            connectedRelationships.forEach((rel: any, index: number) => {
                const objId = rel.objectId.toString();
                let objNode = nodesRef.current.find((n) => n.id === objId);
                const angle = (index / totalRelationships) * 2 * Math.PI;

                if (!objNode) {
                    const objectDetails = data.objects ? data.objects[objId] : null;
                    objNode = { id: objId, label: objectDetails?.type || objId, type: 'object',
                        x: node.x! + RADIUS * Math.cos(angle), y: node.y! + RADIUS * Math.sin(angle),
                    };
                    nodesRef.current.push(objNode);
                    positionsRef.current.set(objId, { x: objNode.x, y: objNode.y });
                }

                const edgeExists = edgesRef.current.some((e) =>
                    (e.source.id === nodeId && e.target.id === objId) || (e.source.id === objId && e.target.id === nodeId)
                );
                if (!edgeExists) {
                    edgesRef.current.push({ id: `${nodeId}-${objId}`, source: node, target: objNode, label: rel.qualifier || '', });
                }
                newCollapsed.delete(objId);
            });
        }

        setCollapsedNodes(newCollapsed);
        setContextMenu(null);
        setUpdateFlag((prev) => prev + 1);
    }, [data, collapsedNodes]);
    
  
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
        
        
        const events = data.events || [];
        const objects = data.objects || {};
        const filteredEvents = events.filter(
            (evt: any) => selectedTypes.length === 0 || selectedTypes.includes(evt.type)
        );
        const chunkedEvents = filteredEvents.slice(0, chunk * MAX_CHUNK);

      

        const eventNodes: NodeDatum[] = chunkedEvents.map((evt: any) => ({ id: evt.id.toString(), label: evt.type || evt.activity || 'Event', type: 'event', }));
        const objectIds = new Set<string>();
        chunkedEvents.forEach((evt: any) => (evt.relationships || []).forEach((rel: any) => objectIds.add(rel.objectId)));
        const objectNodes: NodeDatum[] = Array.from(objectIds).map((objId) => ({ id: objId.toString(), label: objects[objId]?.type || objId, type: 'object', }));

        const existingNodeIds = new Set(nodesRef.current.map((n) => n.id));
        nodesRef.current = [...nodesRef.current, ...objectNodes.filter((n) => !existingNodeIds.has(n.id)), ...eventNodes.filter((n) => !existingNodeIds.has(n.id))];

        nodesRef.current.forEach((n) => {
            if (!positionsRef.current.has(n.id)) {
                let newX, newY, overlapping;
                do {
                    newX = width / 2 + Math.random() * 400 - 200;
                    newY = height / 2 + Math.random() * 400 - 200;
                    overlapping = Array.from(positionsRef.current.values()).some((p) => Math.hypot(p.x - newX, p.y - newY) < NODE_RADIUS * 2);
                } while (overlapping);
                n.x = newX;
                n.y = newY;
                positionsRef.current.set(n.id, { x: n.x, y: n.y });
            } else {
                const pos = positionsRef.current.get(n.id)!;
                n.x = pos.x; n.y = pos.y;
            }
        });
        
        const newEdges: EdgeDatum[] = [];
        chunkedEvents.forEach((evt: any) => {
            (evt.relationships || []).forEach((rel: any, idx: number) => {
                const source = nodesRef.current.find((n) => n.id === evt.id.toString());
                const target = nodesRef.current.find((n) => n.id === rel.objectId.toString());
                if (source && target) {
                    newEdges.push({ id: `${evt.id}-${rel.objectId}-${idx}`, source, target, label: rel.qualifier || '', });
                }
            });
        });
        const edgeMap = new Map<string, EdgeDatum>();
        edgesRef.current.forEach((e) => edgeMap.set(e.id, e));
        newEdges.forEach((e) => { if (!edgeMap.has(e.id)) { edgeMap.set(e.id, e); } });
        edgesRef.current = Array.from(edgeMap.values());








       
        g.selectAll('line')
            .data(
                edgesRef.current.filter((d) => !collapsedNodes.has(d.source.id) && !collapsedNodes.has(d.target.id))
            )
            .join('line')
            .attr('stroke', 'black')
            .attr('stroke-width', 1.8)
            .attr('x1', (d) => d.source.x!)
            .attr('y1', (d) => d.source.y!)
            .attr('x2', (d) => d.target.x!)
            .attr('y2', (d) => d.target.y!);

       
        const nodeData = nodesRef.current.filter((d) => !collapsedNodes.has(d.id));

        const nodeGroup = g
            .selectAll<SVGGElement, NodeDatum>('g.node')
            .data(nodeData, (d) => d.id)
            .join(
                (enter) => enter.append('g').attr('class', 'node'),
                (update) => update,
                (exit) => exit.remove()
            )
            .attr('transform', (d) => `translate(${d.x},${d.y})`)
            .call(d3.drag<SVGGElement, NodeDatum>().on('start', dragstarted).on('drag', dragged).on('end', dragended));

       
        nodeGroup.selectAll('circle').remove();
        nodeGroup.selectAll('text').remove();

        nodeGroup
            .append('circle')
            .attr('r', NODE_RADIUS)
            .attr('fill', (d) => {
                const hasHiddenNeighbors = getDanglingNeighbors(d.id, edgesRef.current).some((n) =>
                    collapsedNodes.has(n.id)
                );
                
                if (hasHiddenNeighbors) {
                    return 'lightgray'; 
                }
                return d.type === 'event' ? 'orange' : 'steelblue'; 
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                if (!svgRef.current) return;
                const [x, y] = d3.pointer(event, svgRef.current);
                setContextMenu({ x, y, node: d });
            });

       
        nodeGroup.each(function (d) {
             const group = d3.select(this);
             const words = d.label.split(/[\s_]+|(?=[A-Z])/g);
            
             
             const lineHeight = 8;
             const finalLines = words.slice(0, 3); 
             
             const text = group.append('text').attr('text-anchor', 'middle').attr('fill', 'white').attr('font-size', 8).attr('pointer-events', 'none');
             const offset = (finalLines.length - 1) * -lineHeight * 0.5;
             text.selectAll('tspan')
                 .data(finalLines)
                 .enter()
                 .append('tspan')
                 .attr('x', 0)
                 .attr('y', (_, i) => offset + i * lineHeight)
                 .text((t) => t);
        });

    }, [data, chunk, selectedTypes, collapsedNodes, updateFlag]);
    
 
    return {
        collapsedNodes,
        contextMenu,
        setContextMenu,
        handleCollapse,
        handleExpand,
        nodesRef,
        edgesRef,
        updateFlag,
    };
};






