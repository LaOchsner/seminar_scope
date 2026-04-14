import { useMemo } from 'react';
import { BaseEdge, type Edge, type EdgeProps, getBezierPath, Position, useInternalNode } from '@xyflow/react';
import { getFloatingEdgeParams } from '~/lib/abstraction/floatingEdge';

export type AbstractionDfEdgeData = {
    objectType: string;
    color: string;
    identityLabel?: string;
    loopSide?: Position;
};

const LOOP_RADIUS = 14;

function selfLoopPath(
    px: number, py: number,
    w: number, h: number,
    side: Position
): string {
    const cx = px + w / 2;
    const cy = py + h / 2;
    const r = LOOP_RADIUS;
    switch (side) {
        case Position.Left:
            return `M ${px} ${cy + r} A ${r} ${r} 0 1 0 ${px} ${cy - r}`;
        case Position.Top:
            return `M ${cx - r} ${py} A ${r} ${r} 0 1 0 ${cx + r} ${py}`;
        case Position.Bottom:
            return `M ${cx + r} ${py + h} A ${r} ${r} 0 1 0 ${cx - r} ${py + h}`;
        case Position.Right:
        default:
            return `M ${px + w} ${cy - r} A ${r} ${r} 0 1 1 ${px + w} ${cy + r}`;
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

    // Self-loop: draw a proper arc on the least-congested side
    if (source === target) {
        const w = sourceNode.measured?.width ?? 0;
        const h = sourceNode.measured?.height ?? 0;
        const px = sourceNode.internals.positionAbsolute.x;
        const py = sourceNode.internals.positionAbsolute.y;
        const side = data?.loopSide ?? Position.Right;
        const path = selfLoopPath(px, py, w, h, side);
        return <BaseEdge id={id} path={path} style={edgeStyle} markerEnd="url(#df-arrow)" />;
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
