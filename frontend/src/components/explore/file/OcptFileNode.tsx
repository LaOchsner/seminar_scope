import { memo, useEffect, useMemo, useState } from 'react';
import { scaleOrdinal } from '@visx/scale';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { schemeSet1 } from 'd3-scale-chromatic';
import { ChevronDown, Loader2, ShieldCheck, TreePine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import AssetTypeList from '~/components/explore/AssetTypeList';
import BaseFileNode from '~/components/explore/file/BaseFileNode';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { useGetConformanceOcptOcel, useGetConformanceOcptOcpt, useGetOcpt } from '~/services/queries';
import { generateColorMap, getDeterministicColor } from '~/lib/colors';
import { propagateMapDownstream, syncMatchingColorsGlobally } from '~/lib/explore/flowActions';
import { FileExploreNodeData } from '~/types/explore/nodeData/fileNodeData';
import { FileNode } from '~/types/explore/nodes';

const OcptFileNode = memo<NodeProps<FileNode>>((props) => {
    const [fileId, setFileId] = useState<null | string>(null);
    const { data } = useGetOcpt(fileId, true);
    const navigate = useNavigate();
    const { updateNodeData, initializeDataState } = useExploreFlowStore();
    const { id, data: nodeData } = props;
    const { processedData, assets, conformanceData } = nodeData;

    const viewState = useMemo(
        () => nodeData.viewState || { filteredObjectTypes: [], colorScale: { domain: [], range: [] } },
        [nodeData.viewState]
    );

    // Reactively subscribe to colorMap so filter checkboxes re-render when colors change
    const colorMap = useExploreFlowStore((s) => {
        const node = s.nodes.find((n) => n.id === id);
        const raw = (node?.data as FileExploreNodeData)?.colorMap;
        if (raw && typeof raw === 'object' && typeof raw !== 'function' && Object.keys(raw).length > 0) {
            return raw as Record<string, string>;
        }
        return undefined;
    });

    // The conformance input can be either an OCEL file or another OCPT file
    const ocelFileId = useMemo(() => {
        const ocelAsset = assets.find((a) => a.io === 'input' && a.type === 'ocelFile');
        return ocelAsset?.id ?? null;
    }, [assets]);

    const ocptInputFileId = useMemo(() => {
        const ocptAsset = assets.find((a) => a.io === 'input' && (a.type === 'ocptFile' || a.type === 'ocptAsset'));
        return ocptAsset?.id ?? null;
    }, [assets]);

    const conformanceMode = ocelFileId ? 'ocpt-ocel' : ocptInputFileId ? 'ocpt-ocpt' : null;
    const { data: conformanceOcelResult, isLoading: isOcelLoading } = useGetConformanceOcptOcel(
        conformanceMode === 'ocpt-ocel' ? fileId : null,
        conformanceMode === 'ocpt-ocel' ? ocelFileId : null
    );
    const { data: conformanceOcptResult, isLoading: isOcptLoading } = useGetConformanceOcptOcpt(
        conformanceMode === 'ocpt-ocpt' ? fileId : null,
        conformanceMode === 'ocpt-ocpt' ? ocptInputFileId : null
    );
    const conformanceResult = conformanceOcelResult ?? conformanceOcptResult;

    const isConformanceLoading = isOcelLoading || isOcptLoading;
    // Store conformance result in node data for access from OcptViewer/Sidebar
    useEffect(() => {
        if (conformanceResult) {
            updateNodeData(id, { conformanceData: conformanceResult });
        }
    }, [conformanceResult, id, updateNodeData]);

    // Clear conformance data when conformance input disconnected
    useEffect(() => {
        if (!conformanceMode && conformanceData) {
            updateNodeData(id, { conformanceData: undefined });
        }
    }, [conformanceMode, conformanceData, id, updateNodeData]);

    useEffect(() => {
        if (data && viewState.colorScale.domain.length === 0) {
            const initialViewState = {
                filteredObjectTypes: [],
                colorScale: {
                    domain: data.ocpt.ots,
                    range: schemeSet1.slice(0, data.ocpt.ots.length),
                },
            };
            updateNodeData(id, { viewState: initialViewState });
        }
    }, [data, viewState, id, updateNodeData]);

    // Initialize colorMap when OCPT data loads, if no valid colorMap exists yet.
    // This mirrors what FileSelectionDialog does for OCEL files on upload.
    useEffect(() => {
        if (data && data.ocpt.ots && data.ocpt.ots.length > 0) {
            const currentColorMap = nodeData.colorMap;
            const hasValidColorMap =
                currentColorMap &&
                typeof currentColorMap === 'object' &&
                typeof currentColorMap !== 'function' &&
                Object.keys(currentColorMap).length > 0;
            if (!hasValidColorMap) {
                const newColorMap = generateColorMap(data.ocpt.ots);
                updateNodeData(id, { colorMap: newColorMap });
                setTimeout(() => {
                    syncMatchingColorsGlobally(id);
                    propagateMapDownstream(id, newColorMap);
                }, 10);
            }
        }
    }, [data, id, updateNodeData, nodeData.colorMap]);

    const visualize = (filter?: string) => {
        navigate(`/data/pipeline/explore/ocpt/${id}${filter ? `?filter=${filter}` : ''}`);
    };

    const ocptAsset = useMemo(
        () => assets.find((a) => a.io === 'output' && (a.type === 'ocptFile' || a.type === 'ocptAsset')),
        [assets]
    );

    useMemo(() => {
        setFileId(ocptAsset?.id ?? null);
    }, [ocptAsset]);

    useEffect(() => {
        if (data) {
            updateNodeData(id, { processedData: data.ocpt });
        }
    }, [data, id, updateNodeData]);

    const handleObjectTypeToggle = (objectType: string) => {
        if (viewState) {
            const newFilteredObjectTypes = viewState.filteredObjectTypes.includes(objectType)
                ? viewState.filteredObjectTypes.filter((ot) => ot !== objectType)
                : [...viewState.filteredObjectTypes, objectType];
            updateNodeData(id, { viewState: { ...viewState, filteredObjectTypes: newFilteredObjectTypes } });
        }
    };

    // Build colorScale: if colorMap exists use it, otherwise fall back to viewState.colorScale.range
    const colorScale = useMemo(() => {
        if (colorMap && viewState.colorScale.domain.length > 0) {
            const domain = viewState.colorScale.domain;
            const range = domain.map((ot) => colorMap[ot] || getDeterministicColor(ot));
            return scaleOrdinal<string, string>({ domain, range });
        }
        return viewState
            ? scaleOrdinal({ domain: viewState.colorScale.domain, range: viewState.colorScale.range })
            : scaleOrdinal<string, string>({ domain: [], range: [] });
    }, [colorMap, viewState]);

    const hasFile = Boolean(ocptAsset);

    return (
        <BaseFileNode
            {...props}
            title="OCPT File"
            iconName="fileJson"
            handleOptions={[
                { id: 'source', position: Position.Right, type: 'source' as const },
                { id: 'target', position: Position.Left, type: 'target' as const },
            ]}
            dropdownOptions={[
                { label: 'Open File', action: 'openFileDialog' as const, icon: 'file' },
                { label: 'Set Custom Color', action: 'setCustomColor' as const, icon: 'palette' },
            ]}
        >
            {hasFile && (
                <div className="mt-2 border-t pt-2">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Visualizations</p>
                    <div className="flex flex-col gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start h-7 px-2 text-xs"
                            onClick={() => visualize(viewState.filteredObjectTypes.join(','))}
                        >
                            <TreePine className="mr-2 h-3.5 w-3.5 text-green-600" />
                            Process Tree
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-between h-7 px-2 text-xs font-normal"
                                >
                                    <div className="flex items-center truncate">
                                        {viewState.filteredObjectTypes.length > 0 ? (
                                            <div className="flex items-center gap-1 mr-2">
                                                {viewState.filteredObjectTypes.slice(0, 3).map((ot) => (
                                                    <div
                                                        key={ot}
                                                        className="h-2 w-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: colorScale(ot) }}
                                                    />
                                                ))}
                                                {viewState.filteredObjectTypes.length > 3 && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        +{viewState.filteredObjectTypes.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground mr-2">Filter Objects...</span>
                                        )}
                                    </div>
                                    <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                                {processedData?.ots.map((ot: string) => (
                                    <DropdownMenuItem key={ot} onSelect={(e) => e.preventDefault()}>
                                        <Checkbox
                                            checked={viewState.filteredObjectTypes.includes(ot)}
                                            onCheckedChange={() => handleObjectTypeToggle(ot)}
                                            className="mr-2"
                                            style={{
                                                borderColor: colorScale(ot),
                                                backgroundColor: viewState.filteredObjectTypes.includes(ot)
                                                    ? colorScale(ot)
                                                    : 'transparent',
                                            }}
                                        />
                                        <span className="truncate">{ot}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="relative mt-2 border-t pt-2">
                        <Handle
                            id="conformanceTarget"
                            type="target"
                            position={Position.Left}
                            style={{ left: '-0.75rem' }}
                        />
                        <p className="text-xs font-semibold text-gray-500 mb-2">Conformance</p>
                        {!conformanceMode ? (
                            <div className="flex flex-col gap-1">
                                <AssetTypeList types={['ocelFile', 'ocptFile']} />
                            </div>
                        ) : isConformanceLoading ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Computing conformance...
                            </div>
                        ) : conformanceData ? (
                            <div className="flex flex-col gap-1 text-xs">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                                    <span className="font-medium">
                                        Fitness: {(conformanceData.fitness * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-3.5 w-3.5 text-orange-600" />
                                    <span className="font-medium">
                                        Precision: {(conformanceData.precision * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </BaseFileNode>
    );
});
export default OcptFileNode;
