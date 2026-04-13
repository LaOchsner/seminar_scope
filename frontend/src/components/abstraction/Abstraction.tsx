import { useMemo } from 'react';
import { Background, Controls, type Edge, type Node, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ObjectTypeNode from '~/components/abstraction/nodes/ObjectTypeNode';
import { AnimatedSVGEdge, type AnimatedSvgEdgeData } from '~/components/flow/AnimateEdge';

const EmptyNode = () => {
    return null;
};

interface AbstractionProps {
    abstraction: any;
}

const Abstraction: React.FC<AbstractionProps> = ({ abstraction }) => {
    // Graph Information from React Flow
    const [nodes, setNodes] = useNodesState([] as Node[]);
    const [edges, setEdges] = useEdgesState([] as Edge<AnimatedSvgEdgeData>[]);

    const edgeTypes = useMemo(
        () => ({
            animatedSvgEdge: AnimatedSVGEdge,
        }),
        []
    );

    const nodeTypes = useMemo(
        () => ({
            objectTypeNode: ObjectTypeNode,
            none: EmptyNode,
        }),
        []
    );

    return (
        <div className="h-full w-full relative">
            <ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} nodeTypes={nodeTypes}>
                <Background />
                <Controls position="top-left" />
            </ReactFlow>
        </div>
    );
};

export default Abstraction;
