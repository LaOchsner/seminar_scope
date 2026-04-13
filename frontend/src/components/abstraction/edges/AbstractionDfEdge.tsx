import { useMemo } from 'react';
import { BaseEdge, type Edge, type EdgeProps, EdgeText, getSmoothStepPath } from '@xyflow/react';
import { useColorScaleStore } from '~/stores/store';

export type AbstractionDfEdgeData = {
    objectType: string;
    identityLabel?: string;
};

export const AbstractionDfEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    label, // May be used for something else in the future
    data,
}: EdgeProps<Edge<AbstractionDfEdgeData>>) => {
    const { colorScale } = useColorScaleStore();

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const edgeColor = useMemo(() => {
        if (data?.objectType) {
            return colorScale(data.objectType);
        }
        return '#b1b1b7';
    }, [data?.objectType, colorScale]);

    const edgeStyle = useMemo(() => {
        return {
            ...style,
            stroke: edgeColor,
            strokeWidth: 1.5,
        };
    }, [edgeColor, style]);

    return (
        <>
            <marker
                id={`marker`}
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
                markerUnits="strokeWidth"
            >
                <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
            </marker>

            <BaseEdge id={id} path={edgePath} style={edgeStyle} markerEnd={`url(#marker)`} />

            {/* Edge label */}
            {data?.identityLabel && (
                <EdgeText x={labelX} y={labelY} label={data?.identityLabel} className="text-black" />
            )}
        </>
    );
};
