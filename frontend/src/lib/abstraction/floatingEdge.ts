import { type InternalNode, Position } from '@xyflow/react';

function getNodeCenter(node: InternalNode) {
    const { x, y } = node.internals.positionAbsolute;
    const w = node.measured?.width ?? 0;
    const h = node.measured?.height ?? 0;
    return { x: x + w / 2, y: y + h / 2, w, h };
}

export function getFloatingEdgeParams(source: InternalNode, target: InternalNode) {
    const s = getNodeCenter(source);
    const t = getNodeCenter(target);

    const isSelfLoop = source.id === target.id;

    if (isSelfLoop) {
        // Self-loop: exit upper-right, re-enter lower-right → bezier bulges to the right
        return {
            sx: s.x + s.w / 2,
            sy: s.y - s.h / 4,
            tx: s.x + s.w / 2,
            ty: s.y + s.h / 4,
            sourcePos: Position.Right,
            targetPos: Position.Right,
        };
    }

    const dy = t.y - s.y;
    const dx = t.x - s.x;

    // Primary axis: pick the side closest to the target
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let sx: number, sy: number, tx: number, ty: number;
    let sourcePos: Position, targetPos: Position;

    if (absDy >= absDx) {
        // Primarily vertical — exit/enter top or bottom
        if (dy >= 0) {
            sx = s.x;
            sy = s.y + s.h / 2;
            tx = t.x;
            ty = t.y - t.h / 2;
            sourcePos = Position.Bottom;
            targetPos = Position.Top;
        } else {
            sx = s.x;
            sy = s.y - s.h / 2;
            tx = t.x;
            ty = t.y + t.h / 2;
            sourcePos = Position.Top;
            targetPos = Position.Bottom;
        }
    } else {
        // Primarily horizontal — exit/enter left or right
        if (dx >= 0) {
            sx = s.x + s.w / 2;
            sy = s.y;
            tx = t.x - t.w / 2;
            ty = t.y;
            sourcePos = Position.Right;
            targetPos = Position.Left;
        } else {
            sx = s.x - s.w / 2;
            sy = s.y;
            tx = t.x + t.w / 2;
            ty = t.y;
            sourcePos = Position.Left;
            targetPos = Position.Right;
        }
    }

    return { sx, sy, tx, ty, sourcePos, targetPos };
}
