import { useMemo } from 'react';
import { BaseEdge, type Edge, type EdgeProps, getSmoothStepPath, useInternalNode } from '@xyflow/react';
import { getFloatingEdgeParams } from '~/lib/abstraction/floatingEdge';

export type AbstractionOtEvEdgeData = {
    objectType: string;
    color: string;
    multiplicityLabel?: string;
    diffStatus?: 'unique' | 'shared';
};

export const AbstractionOtEvEdge = ({
    id,
    source,
    target,
    style = {},
    data,
}: EdgeProps<Edge<AbstractionOtEvEdgeData>>) => {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    const isShared = data?.diffStatus === 'shared';
    const edgeStyle = useMemo(
        () => ({
            ...style,
            stroke: isShared ? '#b1b1b7' : (data?.color ?? '#b1b1b7'),
            strokeWidth: 1,
            strokeDasharray: '5 4',
            opacity: isShared ? 0.2 : 0.7,
        }),
        [data?.color, isShared, style]
    );

    if (!sourceNode || !targetNode) return null;

    const { sx, sy, tx, ty, sourcePos, targetPos } = getFloatingEdgeParams(sourceNode, targetNode);

    const [path] = getSmoothStepPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos,
        targetX: tx,
        targetY: ty,
        targetPosition: targetPos,
    });

    return <BaseEdge id={id} path={path} style={edgeStyle} />;
};
