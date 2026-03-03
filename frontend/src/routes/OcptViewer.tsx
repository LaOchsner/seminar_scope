// import { useEffect, useState } from 'react';
// import { scaleOrdinal } from '@visx/scale';
// import { useParams, useSearchParams } from 'react-router-dom';
// import { SidebarProvider } from '~/components/ui/sidebar';
// import BreadcrumbNav from '~/components/BreadcrumbNav';
// import OCPT from '~/components/ocpt/OCPT';
// import OcptSidebar from '~/components/ocpt/OcptSidebar';
// import { useExploreFlowStore } from '~/stores/exploreStore';
// import { useIsOcptMode } from '~/stores/store';
// import { addIdsToTree } from '~/lib/ocpt/ocptAddIds';
// import { VisualizationNode } from '~/types/explore/nodes';
// import { type TreeNode } from '~/types/ocpt/ocpt.types';
// const OcptViewer: React.FC = () => {
//     const [treeData, setTreeData] = useState<TreeNode | null>(null);
//     const [objectTypes, setObjectTypes] = useState<string[]>([]);
//     const { nodeId } = useParams<{ nodeId: string }>();
//     const [searchParams] = useSearchParams();
//     const { getNode, updateNodeData } = useExploreFlowStore();
//     const { isOcptMode } = useIsOcptMode();
//     const node = nodeId ? (getNode(nodeId) as VisualizationNode) : undefined;
//     const nodeData = node?.data;
//     const viewState = nodeData?.viewState;
//     const colorScale = viewState
//         ? scaleOrdinal<string, string>({ domain: viewState.colorScale.domain, range: viewState.colorScale.range })
//         : scaleOrdinal<string, string>({ domain: [], range: [] });
//     useEffect(() => {
//         const filterFromUrl = searchParams.get('filter');
//         // Only sync from the URL if the parameter exists.
//         if (filterFromUrl !== null && nodeId && viewState) {
//             const newFilteredObjectTypes = filterFromUrl === '' ? [] : filterFromUrl.split(',');
//             // Update the store only if the URL state is different from the store state.
//             if (JSON.stringify(viewState.filteredObjectTypes) !== JSON.stringify(newFilteredObjectTypes)) {
//                 updateNodeData(nodeId, { viewState: { ...viewState, filteredObjectTypes: newFilteredObjectTypes } });
//             }
//         }
//         // We only want this effect to run when the component loads or the URL/node changes,
//         // not when the viewState is updated by the user in the sidebar.
//     }, [searchParams, nodeId]);
//     useEffect(() => {
//         if (nodeId) {
//             const processedData = nodeData?.processedData;
//             if (processedData) {
//                 const idTree = addIdsToTree(processedData.hierarchy);
//                 setTreeData(idTree);
//                 setObjectTypes(processedData.ots);
//             }
//         }
//     }, [nodeId, nodeData]);
//     return (
//         <SidebarProvider>
//             <div className="h-screen w-screen overflow-hidden">
//                 <BreadcrumbNav />
//                 <div className="flex flex-1 h-full w-full">
//                     {isOcptMode && node ? (
//                         <OCPT treeData={treeData} colorScale={colorScale} node={node} />
//                     ) : (
//                         // <Flow objectTypes={objectTypes} />
//                         <div></div>
//                     )}
//                 </div>
//                 {nodeId && viewState ? (
//                     <OcptSidebar
//                         objectTypes={objectTypes}
//                         coloring={colorScale}
//                         nodeId={nodeId}
//                         filteredObjectTypes={viewState.filteredObjectTypes}
//                         onFilteredObjectTypesChange={(newFilteredObjectTypes) => {
//                             updateNodeData(nodeId, {
//                                 viewState: { ...viewState, filteredObjectTypes: newFilteredObjectTypes },
//                             });
//                         }}
//                         conformanceData={nodeData?.conformanceData}
//                     />
//                 ) : (
//                     <div>Can not load sidebar. No nodeId found.</div>
//                 )}
//             </div>
//         </SidebarProvider>
//     );
// };
// export default OcptViewer;
import { useEffect, useMemo, useState } from 'react';
import { scaleOrdinal } from '@visx/scale';
import { useParams, useSearchParams } from 'react-router-dom';
import { SidebarProvider } from '~/components/ui/sidebar';
import BreadcrumbNav from '~/components/BreadcrumbNav';
import OCPT from '~/components/ocpt/OCPT';
import OcptSidebar from '~/components/ocpt/OcptSidebar';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { useIsOcptMode } from '~/stores/store';
import { getDeterministicColor } from '~/lib/colors';
import { addIdsToTree } from '~/lib/ocpt/ocptAddIds';
import { FileExploreNodeData } from '~/types/explore/nodeData/fileNodeData';
import { VisualizationNode } from '~/types/explore/nodes';
import { type TreeNode } from '~/types/ocpt/ocpt.types';

const OcptViewer: React.FC = () => {
    const [treeData, setTreeData] = useState<TreeNode | null>(null);
    const [objectTypes, setObjectTypes] = useState<string[]>([]);
    const { nodeId } = useParams<{ nodeId: string }>();
    const [searchParams] = useSearchParams();
    const { getNode, updateNodeData } = useExploreFlowStore();
    const { isOcptMode } = useIsOcptMode();

    const node = nodeId ? (getNode(nodeId) as VisualizationNode) : undefined;
    const nodeData = node?.data;
    const viewState = nodeData?.viewState;

    // Reactively subscribe to colorMap so the tree re-renders when colors change
    const colorMap = useExploreFlowStore((s) => {
        const n = s.nodes.find((n) => n.id === nodeId);
        const raw = (n?.data as FileExploreNodeData)?.colorMap;
        if (raw && typeof raw === 'object' && typeof raw !== 'function' && Object.keys(raw).length > 0) {
            return raw as Record<string, string>;
        }
        return undefined;
    });

    // Build colorScale: if colorMap exists, use it. Otherwise fall back to viewState.colorScale.range.
    const colorScale = useMemo(() => {
        if (viewState && colorMap && viewState.colorScale.domain.length > 0) {
            const domain = viewState.colorScale.domain;
            const range = domain.map((ot) => colorMap[ot] || getDeterministicColor(ot));
            return scaleOrdinal<string, string>({ domain, range });
        }
        if (viewState) {
            return scaleOrdinal<string, string>({
                domain: viewState.colorScale.domain,
                range: viewState.colorScale.range,
            });
        }
        return scaleOrdinal<string, string>({ domain: [], range: [] });
    }, [viewState, colorMap]);

    useEffect(() => {
        const filterFromUrl = searchParams.get('filter');
        // Only sync from the URL if the parameter exists.
        if (filterFromUrl !== null && nodeId && viewState) {
            const newFilteredObjectTypes = filterFromUrl === '' ? [] : filterFromUrl.split(',');

            // Update the store only if the URL state is different from the store state.
            if (JSON.stringify(viewState.filteredObjectTypes) !== JSON.stringify(newFilteredObjectTypes)) {
                updateNodeData(nodeId, { viewState: { ...viewState, filteredObjectTypes: newFilteredObjectTypes } });
            }
        }
        // We only want this effect to run when the component loads or the URL/node changes,
        // not when the viewState is updated by the user in the sidebar.
    }, [searchParams, nodeId]);

    useEffect(() => {
        if (nodeId) {
            const processedData = nodeData?.processedData;

            if (processedData) {
                const idTree = addIdsToTree(processedData.hierarchy);
                setTreeData(idTree);
                setObjectTypes(processedData.ots);
            }
        }
    }, [nodeId, nodeData]);

    return (
        <SidebarProvider>
            <div className="h-screen w-screen overflow-hidden">
                <BreadcrumbNav />
                <div className="flex flex-1 h-full w-full">
                    {isOcptMode && node ? (
                        <OCPT treeData={treeData} colorScale={colorScale} node={node} />
                    ) : (
                        // <Flow objectTypes={objectTypes} />
                        <div></div>
                    )}
                </div>
                {nodeId && viewState ? (
                    <OcptSidebar
                        objectTypes={objectTypes}
                        coloring={colorScale}
                        nodeId={nodeId}
                        filteredObjectTypes={viewState.filteredObjectTypes}
                        onFilteredObjectTypesChange={(newFilteredObjectTypes) => {
                            updateNodeData(nodeId, {
                                viewState: { ...viewState, filteredObjectTypes: newFilteredObjectTypes },
                            });
                        }}
                        conformanceData={nodeData?.conformanceData}
                    />
                ) : (
                    <div>Can not load sidebar. No nodeId found.</div>
                )}
            </div>
        </SidebarProvider>
    );
};

export default OcptViewer;
