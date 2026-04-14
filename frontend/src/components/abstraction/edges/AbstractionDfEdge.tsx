import { useMemo } from 'react';
import { BaseEdge, type Edge, type EdgeProps, getBezierPath, Position, useInternalNode } from '@xyflow/react';
import { getFloatingEdgeParams } from '~/lib/abstraction/floatingEdge';

export type AbstractionDfEdgeData = {
    objectType: string;
    color: string;
    identityLabel?: string;
    loopSide?: Position;
};

/** How far the loop bulges out from the node edge. */
const LOOP_EXTENT = 52;

/**
 * Cubic-bezier self-loop paths. Each path exits the node on one side,
 * curves away from the node by LOOP_EXTENT, and re-enters the same side.
 * The path ends pointing INTO the node so the arrowhead reads naturally.
 *
 * ox/oy are the offsets along the edge from the node centre to the two
 * attach points — kept proportional to node size so the loop doesn't look
 * squashed on very wide or very narrow nodes.
 */
function selfLoopPath(
    px: number, py: number,
    w: number, h: number,
    side: Position
): string {
    const cx = px + w / 2;
    const cy = py + h / 2;
    const ex = LOOP_EXTENT;
    const ox = Math.max(w * 0.28, 10);
    const oy = Math.max(h * 0.35, 8);

    switch (side) {
        case Position.Left:
            // exits bottom-left, loops left, re-enters top-left → arrow points right into node
            return `M ${px} ${cy + oy} C ${px - ex} ${cy + oy} ${px - ex} ${cy - oy} ${px} ${cy - oy}`;
        case Position.Top:
            // exits top-right, loops upward, re-enters top-left → arrow points down into node
            return `M ${cx + ox} ${py} C ${cx + ox} ${py - ex} ${cx - ox} ${py - ex} ${cx - ox} ${py}`;
        case Position.Bottom:
            // exits bottom-left, loops downward, re-enters bottom-right → arrow points up into node
            return `M ${cx - ox} ${py + h} C ${cx - ox} ${py + h + ex} ${cx + ox} ${py + h + ex} ${cx + ox} ${py + h}`;
        case Position.Right:
        default:
            // exits top-right, loops right, re-enters bottom-right → arrow points left into node
            return `M ${px + w} ${cy - oy} C ${px + w + ex} ${cy - oy} ${px + w + ex} ${cy + oy} ${px + w} ${cy + oy}`;
    }
}

export const AbstractionDfEdge = ({
    id,
    source,
    target,
    style = {},
    data,
}: EdgeProps<Edge<AbstractionDfEdgeData>>) => {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    const edgeStyle = useMemo(
        () => ({ ...style, stroke: data?.color ?? '#b1b1b7', strokeWidth: 1.5 }),
        [data?.color, style]
    );

    if (!sourceNode || !targetNode) return null;

    // Self-loop: draw a cubic-bezier loop on the least-congested side
    if (source === target) {
        const w = sourceNode.measured?.width ?? 0;
        const h = sourceNode.measured?.height ?? 0;
        const px = sourceNode.internals.positionAbsolute.x;
        const py = sourceNode.internals.positionAbsolute.y;
        const side = data?.loopSide ?? Position.Right;
        const path = selfLoopPath(px, py, w, h, side);
        const loopStyle = { ...edgeStyle, strokeWidth: 2 };
        return <BaseEdge id={id} path={path} style={loopStyle} markerEnd="url(#df-arrow)" />;
    }

    const { sx, sy, tx, ty, sourcePos, targetPos } = getFloatingEdgeParams(sourceNode, targetNode);

    const [path] = getBezierPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos,
        targetX: tx,
        targetY: ty,
        targetPosition: targetPos,
    });

    return <BaseEdge id={id} path={path} style={edgeStyle} markerEnd="url(#df-arrow)" />;
};
