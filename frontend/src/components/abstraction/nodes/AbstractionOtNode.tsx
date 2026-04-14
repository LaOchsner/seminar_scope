import { memo } from 'react';
import { Handle, type Node, NodeProps, Position } from '@xyflow/react';

type AbstractionOtNodeProps = {
    objectType: string;
    color: string;
};

const AbstractionOtNode = memo(({ data, id, height, width }: NodeProps<Node<AbstractionOtNodeProps>>) => {
    return (
        <div className={`rounded-full border-[3px]`} style={{ height: height, width: width, borderColor: data.color }}>
            <Handle type="source" position={Position.Right} id={`${id}-out`} />
        </div>
    );
});

export default AbstractionOtNode;
