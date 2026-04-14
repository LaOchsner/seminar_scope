import { useMemo } from 'react';
import { Background, Controls, type Edge, type Node, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AbstractionDfEdge } from '~/components/abstraction/edges/AbstractionDfEdge';
import { AbstractionOtEvEdge } from '~/components/abstraction/edges/AbstractionOtEvEdge';
import AbstractionEvNode from '~/components/abstraction/nodes/AbstractionEvNode';
import AbstractionOtNode from '~/components/abstraction/nodes/AbstractionOtNode';
import { toAbstractionFlow } from '~/lib/abstraction/abstractionToFlow';
import type { OCLanguageAbstraction } from '~/types/abstraction.types';

const nodeTypes = {
    abstractionOtNode: AbstractionOtNode,
    abstractionEvNode: AbstractionEvNode,
};

const edgeTypes = {
    abstractionDfEdge: AbstractionDfEdge,
    abstractionOtEvEdge: AbstractionOtEvEdge,
};

interface AbstractionProps {
    abstraction: OCLanguageAbstraction;
    getObjectColor?: (objectType: string) => string;
}

const Abstraction: React.FC<AbstractionProps> = ({ abstraction, getObjectColor }) => {
    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => toAbstractionFlow(abstraction, getObjectColor),
        [abstraction, getObjectColor]
    );

    const [nodes, , onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState<Edge>(initialEdges);

    return (
        <div className="h-full w-full relative">
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <marker id="df-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
                        <polygon points="0 0, 10 3.5, 0 7" fill="context-stroke" />
                    </marker>
                </defs>
            </svg>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            >
                <Background />
                <Controls position="top-left" />
            </ReactFlow>
        </div>
    );
};

export default Abstraction;
