import { useEffect, useMemo } from 'react';
import { Background, Controls, type Edge, type Node, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AbstractionDfEdge } from '~/components/abstraction/edges/AbstractionDfEdge';
import AbstractionEvNode from '~/components/abstraction/nodes/AbstractionEvNode';
import { toAbstractionFlow } from '~/lib/abstraction/abstractionToFlow';
import type { DfgDiff } from '~/lib/abstraction/abstractionDiff';
import type { OCLanguageAbstraction } from '~/types/abstraction.types';

const nodeTypes = {
    abstractionEvNode: AbstractionEvNode,
};

const edgeTypes = {
    abstractionDfEdge: AbstractionDfEdge,
};

interface AbstractionProps {
    abstraction: OCLanguageAbstraction;
    getObjectColor: (objectType: string) => string;
    filteredObjectTypes: string[];
    diffInfo?: DfgDiff;
}

const Abstraction: React.FC<AbstractionProps> = ({ abstraction, getObjectColor, filteredObjectTypes, diffInfo }) => {
    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => toAbstractionFlow(abstraction, getObjectColor, filteredObjectTypes, diffInfo),
        [abstraction, getObjectColor, filteredObjectTypes, diffInfo]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [setNodes, setEdges, initialNodes, initialEdges]);

    return (
        <div className="h-full w-full relative">
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <marker
                        id="df-arrow"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                        markerUnits="strokeWidth"
                    >
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
