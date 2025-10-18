import { memo, useEffect, useMemo, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { useNavigate } from 'react-router-dom';
import BaseVisualizationNode from '~/components/explore/visualization/BaseVisualizationNode';
import { useGetOcel } from '~/services/queries';
import type { TVisualizationNode } from '~/types/explore';
import { useExploreFlowStore } from '~/stores/exploreStore';

const EventGraphVisualizationNode = memo<NodeProps<TVisualizationNode>>((node) => {
    const [fileId, setFileId] = useState<null | string>(null);
    const { data, isLoading } = useGetOcel(fileId || '');
    const navigate = useNavigate();

    const visualize = () => {
        const { nodes, edges } = useExploreFlowStore.getState();
        localStorage.setItem('currentExploreFlow', JSON.stringify({ nodes, edges }));
        navigate(`/data/pipeline/explore/ocel/${node.id}`);
    };

    useEffect(() => {
        const inputAsset = node.data.assets.find((asset) => asset.io === 'input');
        if (inputAsset) setFileId(inputAsset.id);
    }, [node.data.assets]);

    useEffect(() => {
        if (data) node.data.processedData = data;
    }, [data]);

    return (
        <BaseVisualizationNode
            {...node}
            title="Graph Viewer"
            iconName="network"
            handleOptions={[
                { position: Position.Left, type: 'target' as const },
                { position: Position.Right, type: 'source' as const },
            ]}
            dropdownOptions={[{ label: 'Change Source', action: 'changeSourceFile' as const }]}
            visualize={visualize}
        />
    );
});

export default EventGraphVisualizationNode;

// import { memo, useEffect, useMemo, useState } from 'react';
// import type { NodeProps } from '@xyflow/react';
// import { Position } from '@xyflow/react';
// import { schemeSet1 } from 'd3-scale-chromatic';

// import BaseVisualizationNode from '~/components/explore/visualization/BaseVisualizationNode';
// import { useExploreFlowStore } from '~/stores/exploreStore';
// import { useGetOcpt } from '~/services/queries';
// import { TVisualizationNode } from '~/types/explore';

// const EventGraphVisualizationNode = memo<NodeProps<TVisualizationNode>>((node) => {
//     const [fileId, setFileId] = useState<null | string>(null);
//     const { data,} = useGetOcpt(fileId, true);
//     const { updateNodeData } = useExploreFlowStore();
//     const { id, data: nodeData } = node;
//     const { assets } = nodeData;
//     const viewState = nodeData.viewState || {
//         filteredObjectTypes: [],
//         colorScale: { domain: [], range: [] },
//     };

//     useEffect(() => {
//         if (data && viewState.colorScale.domain.length === 0) {
//             const initialViewState = {
//                 filteredObjectTypes: [],
//                 colorScale: {
//                     domain: data.ocpt.ots,
//                     range: schemeSet1.slice(0, data.ocpt.ots.length),
//                 },
//             };
//             updateNodeData(id, { viewState: initialViewState });
//         }
//     }, [data, viewState, id, updateNodeData]);

//     useMemo(() => {
//         const inputAsset = assets.find((asset) => asset.io === 'input');
//         if (inputAsset) setFileId(inputAsset.id);
//     }, [assets]);

//     useEffect(() => {
//         if (data) {
//             updateNodeData(id, { processedData: data.ocpt });
//         }
//     }, [data, id, updateNodeData]);

//     return (
//         <BaseVisualizationNode
//             {...node}
//             title="Graph Visualization"
//             iconName="network"
//             handleOptions={[
//                 { position: Position.Left, type: 'target' as const },
//                 { position: Position.Right, type: 'source' as const },
//             ]}
//             dropdownOptions={[{ label: 'Change Source', action: 'changeSourceFile' as const }]}
//             customActions={renderVisualizationActions()}
//         />
//     );
// });

// export default EventGraphVisualizationNode;
