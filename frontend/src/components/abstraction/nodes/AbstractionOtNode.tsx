import { memo } from 'react';
import { Handle, type Node, NodeProps, Position } from '@xyflow/react';

type AbstractionOtNodeProps = {
    objectType: string;
    color: string;
    diffStatus?: 'unique' | 'shared';
};

const MUTED_COLOR = '#b1b1b7';

const AbstractionOtNode = memo(({ data, id, height, width }: NodeProps<Node<AbstractionOtNodeProps>>) => {
    const borderColor = data.diffStatus === 'shared' ? MUTED_COLOR : data.color;
    const opacity = data.diffStatus === 'shared' ? 0.35 : 1;
    return (
        <div
            className="rounded-full border-[3px]"
            style={{ height, width, borderColor, opacity }}
        >
            <Handle type="source" position={Position.Right} id={`${id}-out`} />
        </div>
    );
});

export default AbstractionOtNode;
