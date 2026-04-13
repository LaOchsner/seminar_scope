import { memo } from 'react';
import { Handle, type Node, NodeProps, Position } from '@xyflow/react';
import { BaseNode } from '~/components/ui/base-node';

type AbstractionEvNodeProps = {
    eventName: string;
    isStartEvent: boolean;
    isEndEvent: boolean;
};

const AbstractionEvNode = memo(({ data, id }: NodeProps<Node<AbstractionEvNodeProps>>) => {
    return (
        <BaseNode id={id}>
            <Handle type="target" position={Position.Left} />
            <p className="text-xs font-medium px-1">{data?.eventName}</p>
            <Handle type="source" position={Position.Right} />
        </BaseNode>
    );
});

export default AbstractionEvNode;
