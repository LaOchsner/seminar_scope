import { useEffect, useState } from 'react';
import { scaleOrdinal } from '@visx/scale';
import { useParams, useSearchParams } from 'react-router-dom';
import { SidebarProvider } from '~/components/ui/sidebar';
import AppSidebar from '~/components/AppSidebar';
import BreadcrumbNav from '~/components/BreadcrumbNav';
import Flow from '~/components/flow/Flow';
import OCPT from '~/components/ocpt/OCPT';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { useColorScaleStore, useFilteredObjectType, useIsOcptMode } from '~/stores/store';
import { addIdsToTree } from '~/lib/ocpt/addIdsToOcpt';
import type { VisualizationExploreNodeData } from '~/types/explore';
import { type TreeNode } from '~/types/ocpt/ocpt.types';

const OcptViewer: React.FC = () => {
    const [treeData, setTreeData] = useState<TreeNode | null>(null);
    const [objectTypes, setObjectTypes] = useState<string[]>([]);
    const { nodeId } = useParams<{ nodeId: string }>();
    const [searchParams] = useSearchParams();
    const { getNode } = useExploreFlowStore();
    const { colorScales, setColorScaleObjectTypes } = useColorScaleStore();
    const { isOcptMode } = useIsOcptMode();
    const { setFilteredObjectTypes } = useFilteredObjectType();

    const colorScaleData = nodeId ? colorScales.get(nodeId) : undefined;
    const colorScale = colorScaleData
        ? scaleOrdinal({ domain: colorScaleData.domain, range: colorScaleData.range })
        : scaleOrdinal<string, string>({ domain: [], range: [] });

    useEffect(() => {
        const filter = searchParams.get('filter');
        if (nodeId) {
            if (filter) {
                setFilteredObjectTypes(nodeId, filter.split(','));
            } else {
                setFilteredObjectTypes(nodeId, objectTypes);
            }
        }
    }, [searchParams, setFilteredObjectTypes, objectTypes, nodeId]);

    useEffect(() => {
        if (nodeId) {
            const node = getNode(nodeId);
            const nodeData = node?.data as VisualizationExploreNodeData;
            const processedData = nodeData?.processedData;

            if (processedData) {
                const idTree = addIdsToTree(processedData.hierarchy);
                setTreeData(idTree);
                setObjectTypes(processedData.ots);
            }
        }
    }, [nodeId, getNode]);

    useEffect(() => {
        if (nodeId) {
            setColorScaleObjectTypes(nodeId, objectTypes);
        }
    }, [objectTypes, nodeId, setColorScaleObjectTypes]);

    return (
        <SidebarProvider>
            <div className="h-screen w-screen overflow-hidden">
                <BreadcrumbNav />
                <div className="flex flex-1 h-full w-full">
                    {isOcptMode && nodeId ? (
                        <OCPT
                            height={1080}
                            width={1920}
                            treeData={treeData}
                            colorScale={colorScale}
                            objectTypes={objectTypes}
                            nodeId={nodeId}
                        />
                    ) : (
                        <Flow objectTypes={objectTypes} />
                    )}
                </div>
                {nodeId ? (
                    <AppSidebar objectTypes={objectTypes} coloring={colorScale} nodeId={nodeId} />
                ) : (
                    <div>Can not load sidebar. No nodeId found.</div>
                )}
            </div>
        </SidebarProvider>
    );
};

export default OcptViewer;
