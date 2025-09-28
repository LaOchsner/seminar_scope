import { useEffect, useState } from 'react';
import { scaleOrdinal } from '@visx/scale';
import { useParams, useSearchParams } from 'react-router-dom';
import { SidebarProvider } from '~/components/ui/sidebar';
import AppSidebar from '~/components/AppSidebar';
import BreadcrumbNav from '~/components/BreadcrumbNav';
// import Flow from '~/components/flow/Flow';
import OCPT from '~/components/ocpt/OCPT';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { useIsOcptMode } from '~/stores/store';
import { addIdsToTree } from '~/lib/ocpt/addIdsToOcpt';
import type { TVisualizationNode } from '~/types/explore';
import { type TreeNode } from '~/types/ocpt/ocpt.types';

const OcptViewer: React.FC = () => {
    const [treeData, setTreeData] = useState<TreeNode | null>(null);
    const [objectTypes, setObjectTypes] = useState<string[]>([]);
    const { nodeId } = useParams<{ nodeId: string }>();
    const [searchParams] = useSearchParams();
    const { getNode, updateNodeData } = useExploreFlowStore();
    const { isOcptMode } = useIsOcptMode();

    const node = nodeId ? (getNode(nodeId) as TVisualizationNode) : undefined;
    const nodeData = node?.data;
    const viewState = nodeData?.viewState;

    const colorScale = viewState
        ? scaleOrdinal<string, string>({ domain: viewState.colorScale.domain, range: viewState.colorScale.range })
        : scaleOrdinal<string, string>({ domain: [], range: [] });

    useEffect(() => {
        const filter = searchParams.get('filter');
        if (nodeId && viewState) {
            const newFilteredObjectTypes = filter ? filter.split(',') : objectTypes;
            if (JSON.stringify(viewState.filteredObjectTypes) !== JSON.stringify(newFilteredObjectTypes)) {
                updateNodeData(nodeId, { viewState: { ...viewState, filteredObjectTypes: newFilteredObjectTypes } });
            }
        }
    }, [searchParams, updateNodeData, objectTypes, nodeId, viewState]);

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
                        <OCPT
                            height={1080}
                            width={1920}
                            treeData={treeData}
                            colorScale={colorScale}
                            objectTypes={objectTypes}
                            node={node}
                        />
                    ) : (
                        // <Flow objectTypes={objectTypes} />
                        <div></div>
                    )}
                </div>
                {nodeId && viewState ? (
                    <AppSidebar
                        objectTypes={objectTypes}
                        coloring={colorScale}
                        nodeId={nodeId}
                        filteredObjectTypes={viewState.filteredObjectTypes}
                        onFilteredObjectTypesChange={(newFilteredObjectTypes) => {
                            updateNodeData(nodeId, {
                                viewState: { ...viewState, filteredObjectTypes: newFilteredObjectTypes },
                            });
                        }}
                    />
                ) : (
                    <div>Can not load sidebar. No nodeId found.</div>
                )}
            </div>
        </SidebarProvider>
    );
};

export default OcptViewer;
