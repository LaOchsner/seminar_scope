import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { OcelVisualizationD3Props } from '~/components/graph_visualization/types';
import { useGraphInteractions } from '~/components/graph_visualization/useGraphInteractions';
import OcelCollectionSidebar from '~/components/OcelCollectionSidebar';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { useGetOcel, useGetOcelCollection } from '~/services/queries';

const OcelVisualization: React.FC<OcelVisualizationD3Props> = ({
    fileId,
    nodeId,
    isFullScreen = false,
    sourceType = 'ocelFileNode',
}) => {
    const getColorForNode = useExploreFlowStore((s) => s.getColorForNode);
    const initializeDataState = useExploreFlowStore((s) => s.initializeDataState);

    // Subscribe to the actual colorMap to re render to color map changes.
    const colorMap = useExploreFlowStore((s) => {
        const node = s.nodes.find((n) => n.id === nodeId);
        return (node?.data as any)?.colorMap as Record<string, string> | undefined;
    });

    const isCollection = sourceType === 'ocelCollectionNode';
    const isOcel = sourceType === 'ocelFileNode';

    const { data: ocelData, isLoading: ocelLoading, error: ocelError } = useGetOcel(isOcel ? fileId : null);
    const {
        data: collectionData,
        isLoading: collectionLoading,
        error: collectionError,
    } = useGetOcelCollection(isCollection ? fileId : null);

    const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);

    const data = useMemo(() => {
        if (
            isCollection &&
            collectionData?.case_ocels &&
            collectionData.case_ocels.length > 0 &&
            selectedCaseIndex < collectionData.case_ocels.length
        ) {
            return collectionData.case_ocels[selectedCaseIndex];
        }
        return ocelData;
    }, [isCollection, collectionData, ocelData, selectedCaseIndex]);

    const isLoading = isCollection ? collectionLoading : ocelLoading;
    const error = isCollection ? collectionError : ocelError;

    const svgRef = useRef<SVGSVGElement | null>(null);
    const eventsChartRef = useRef<SVGSVGElement | null>(null);
    const objectsChartRef = useRef<SVGSVGElement | null>(null);

    const [chunk, setChunk] = useState(1);
    const [selectedType, setSelectedType] = useState<string>('__ALL__');

    const { contextMenu, handleCollapse, handleExpand, handleTypeChange } = useGraphInteractions(
        nodeId,
        data,
        selectedType,
        setSelectedType,
        chunk,
        setChunk,
        svgRef
    );

    // --- Main Rendering Effect ---
    useEffect(() => {
        if (!data) return;

        // Ensure colors are initialized if they aren't already (Backup for direct page loads)
        const allObjectTypes = new Set<string>();
        if (Array.isArray(data.objectTypes)) {
            data.objectTypes.forEach((t: any) => {
                const name = typeof t === 'string' ? t : t.name;
                if (name) allObjectTypes.add(name);
            });
        } else if (Array.isArray(data.object_types)) {
            data.object_types.forEach((t: any) => {
                const name = typeof t === 'string' ? t : t.name;
                if (name) allObjectTypes.add(name);
            });
        } else if (data.objects) {
            Object.values(data.objects).forEach((obj: any) => {
                if (obj.type) allObjectTypes.add(obj.type);
            });
        }

        if (allObjectTypes.size > 0) {
            // Only initialize if missing (initializeDataState handles the check internally usually,
            // but it's safe to call here to ensure consistency)
            initializeDataState(nodeId, Array.from(allObjectTypes));
        }

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

        const createHistogram = (ref: SVGSVGElement, dataArr: [string, number][], colorFn: (key: string) => string) => {
            const svg = d3.select(ref);
            svg.selectAll('*').remove();

            const width = svg.node()?.clientWidth || 250;
            const height = svg.node()?.clientHeight || 200;
            const margin = { top: 20, right: 20, bottom: 80, left: 40 };

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
                .attr('fill', ([key]) => colorFn(key)) // <--- Uses the passed color function
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

        if (!isFullScreen && !isCollection) {
            if (eventsChartRef.current) {
                // Activities get a static gray color
                createHistogram(eventsChartRef.current, activityCounts, () => '#b6b8bcff');
            }

            if (objectsChartRef.current) {
                // Objects get the dynamic color from the store
                createHistogram(objectsChartRef.current, typeCounts, (k) => getColorForNode(nodeId, k));
            }
        }

        return () => {
            tooltip.remove();
        };

        // CRITICAL: Added 'colorMap' to dependencies.
        // This ensures that when the user changes a color in the dialog, this useEffect runs again,
        // re-calling 'createHistogram' with the new colors.
    }, [data, isFullScreen, isCollection, fileId, nodeId, getColorForNode, initializeDataState, colorMap]);

    const eventTypes: string[] = Array.isArray(data?.eventTypes)
        ? data!.eventTypes.map((t: any) => (typeof t === 'string' ? t : t.name))
        : [];

    if (!fileId) return <p>No File selected</p>;
    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error loading OCEL data</p>;
    if (!data) return <p>No data available</p>;

    const gridLayoutClass = isFullScreen || isCollection ? 'grid-cols-1' : 'grid-cols-4';

    return (
        <div className="flex flex-row w-full h-full overflow-hidden">
            <div className="flex flex-col flex-1 h-full overflow-hidden">
                {contextMenu && (
                    <div
                        className="absolute bg-white border border-gray-300 shadow-lg rounded-md text-sm z-50"
                        style={{ left: contextMenu.x + 20, top: contextMenu.y }}
                    >
                        <button
                            className="block w-full text-left px-3 py-1 hover:bg-gray-100"
                            onClick={() => handleCollapse(contextMenu.node.id)}
                        >
                            Collapse
                        </button>
                        <button
                            className="block w-full text-left px-3 py-1 hover:bg-gray-100"
                            onClick={() => handleExpand(contextMenu.node.id)}
                        >
                            Expand
                        </button>
                    </div>
                )}

                <div className={`grid ${gridLayoutClass} gap-4 p-4 flex-1 overflow-auto`}>
                    <div
                        className={`bg-white rounded-xl shadow p-3 relative flex flex-col ${isFullScreen || isCollection ? 'col-span-4' : 'col-span-3'}`}
                    >
                        <svg ref={svgRef} className="w-full flex-1 min-h-0 border rounded-lg bg-gray-50" />
                    </div>

                    {!isFullScreen && !isCollection && (
                        <div className="col-span-1 flex flex-col gap-4">
                            <div className="bg-white rounded-xl shadow p-3 flex-1 flex flex-col">
                                <h3 className="font-semibold mb-2 text-center text-gray-700">Events per Activity</h3>
                                <svg ref={eventsChartRef} className="w-full h-auto flex-1" />
                            </div>
                            <div className="bg-white rounded-xl shadow p-3 flex-1 flex flex-col">
                                <h3 className="font-semibold mb-2 text-center text-gray-700">Objects per Type</h3>
                                <svg ref={objectsChartRef} className="w-full h-auto flex-1" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <OcelCollectionSidebar
                isCollection={isCollection}
                selectedType={selectedType}
                eventTypes={eventTypes}
                handleTypeChange={handleTypeChange}
                selectedCaseIndex={selectedCaseIndex}
                setSelectedCaseIndex={setSelectedCaseIndex}
                caseCount={collectionData?.case_ocels?.length || 0}
            />
        </div>
    );
};

export default OcelVisualization;
