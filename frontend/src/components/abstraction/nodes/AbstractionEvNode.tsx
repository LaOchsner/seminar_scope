import { memo } from 'react';
import { type Node, NodeProps } from '@xyflow/react';
import { BaseNode } from '~/components/ui/base-node';

type AbstractionEvNodeProps = {
    eventName: string;
    isStartEvent: boolean;
    isEndEvent: boolean;
};

const AbstractionEvNode = memo(({ data, id, height, width }: NodeProps<Node<AbstractionEvNodeProps>>) => {
    return (
        <>
            <BaseNode id={id}>
                <p>{data?.eventName}</p>
            </BaseNode>
        </>
    );
});

export default AbstractionEvNode;
