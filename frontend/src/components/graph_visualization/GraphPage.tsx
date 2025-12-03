

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useGetLogGraphs } from "~/services/queries";

interface GraphPageProps {
  fileId: string;
}

const GraphPage: React.FC<GraphPageProps> = ({ fileId }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { data, isLoading, error } = useGetLogGraphs(fileId);

  // ----------------------------- Transform API Data -----------------------------
  const graph = React.useMemo(() => {
    if (!data) return null;

    const nodes: { id: string; group: string }[] = [];
    const links: { source: string; target: string }[] = [];

    // Add event nodes
    data.event_types.forEach((et: string) => {
      nodes.push({ id: et, group: "event" });
    });

    // Add object nodes
    data.object_types.forEach((ot: string) => {
      nodes.push({ id: ot, group: "object" });
    });

    // Add arcs as links
    data.arcs.forEach((a: any) => {
      links.push({
        source: a.source_type,
        target: a.target_type,
      });
    });

    return { nodes, links };
  }, [data]);

  
  useEffect(() => {
    if (!graph || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g");

    // Zoom
    svg.call(
      d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
        g.attr("transform", event.transform);
      }),
    );

    // Force Simulation
    const simulation = d3
      .forceSimulation(graph.nodes as any)
      .force(
        "link",
        d3
          .forceLink(graph.links)
          .id((d: any) => d.id)
          .distance(90),
      )
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g
      .append("g")
      .attr("stroke", "#8b8b8b")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(graph.links)
      .enter()
      .append("line")
      .attr("stroke-width", 1.5);

    // Node color: event vs object
    const color = (group: string) =>
      group === "event" ? "#00A1FF" : "#FF5F15";

    const node = g
      .append("g")
      .selectAll("circle")
      .data(graph.nodes)
      .enter()
      .append("circle")
      .attr("r", 10)
      .attr("fill", (d: any) => color(d.group))
      .call(
        d3
          .drag<SVGCircleElement, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Labels
    const label = g
      .append("g")
      .selectAll("text")
      .data(graph.nodes)
      .enter()
      .append("text")
      .text((d: any) => d.id)
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .attr("dy", -14);

    // Simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);

      label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
    });
  }, [graph]);

  if (isLoading)
    return (
      <div className="flex w-full h-full justify-center items-center">
        Loading graph...
      </div>
    );

  if (error)
    return (
      <div className="flex w-full h-full justify-center items-center text-red-500">
        Failed to load graph
      </div>
    );

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default GraphPage;
