import { useMemo } from 'react';
import { BaseEdge, type Edge, type EdgeProps, EdgeText, getSmoothStepPath } from '@xyflow/react';
import { useColorScaleStore } from '~/stores/store';

export type AbstractionOtEvEdgeData = {
    objectType: string;
    multiplicityLabel?: string;
};

export const AbstractionOtEvEdge = ({
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
}: EdgeProps<Edge<AbstractionOtEvEdgeData>>) => {
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
            strokeStyle: { strokeDasharray: '5,5' },
        };
    }, [edgeColor, style]);

    return (
        <>
            <BaseEdge id={id} path={edgePath} style={edgeStyle} markerEnd={`url(#marker)`} />

            {/* Edge label */}
            {data?.multiplicityLabel && (
                <EdgeText x={labelX} y={labelY} label={data?.multiplicityLabel} className="text-black" />
            )}
        </>
    );
};
