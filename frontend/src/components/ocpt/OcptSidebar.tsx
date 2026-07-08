import { ScaleOrdinal } from 'd3';
import { Download, ShieldCheck } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
} from '~/components/ui/sidebar';
import { Switch } from '~/components/ui/switch';
import ObjectTypeLegend from '~/components/ocpt/ui/ObjectTypeLegend';

const IDENTITY_RELATION_LEGEND = [
    { symbol: '=', label: 'Strict synchronization' },
    { symbol: '⊂=', label: 'Subset synchronization' },
    { symbol: '⊂∩', label: 'Subset partition' },
    { symbol: '⊂⊗', label: 'Subset overlap' },
    { symbol: '⇒‖', label: 'Concurrent implication' },
    { symbol: '⇒→', label: 'Ordered implication' },
    { symbol: '⇒·k', label: 'Batch implication' },
    { symbol: '↙↘', label: 'Object split' },
    { symbol: '↘↙', label: 'Object merge' },
];

interface OcptSidebarProps {
    objectTypes: string[];
    coloring: ScaleOrdinal<string, string, never>;
    nodeId: string | undefined;
    filteredObjectTypes: string[];
    onFilteredObjectTypesChange: (newFilteredObjectTypes: string[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conformanceData?: any;
    showDetails: boolean;
    onShowDetailsChange: (value: boolean) => void;
    onExport: () => void;
}

const OcptSidebar: React.FC<OcptSidebarProps> = ({
    objectTypes,
    coloring,
    nodeId,
    filteredObjectTypes,
    onFilteredObjectTypesChange,
    conformanceData,
    showDetails,
    onShowDetailsChange,
    onExport,
}) => {
    return (
        <Sidebar side="right">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Project onto Object Type(s)</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem className="ml-1">
                                <ObjectTypeLegend
                                    objectTypes={objectTypes}
                                    coloring={coloring}
                                    nodeId={nodeId}
                                    filteredObjectTypes={filteredObjectTypes}
                                    onFilteredObjectTypesChange={onFilteredObjectTypesChange}
                                />
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>Display</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem className="ml-1">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <Switch checked={showDetails} onCheckedChange={onShowDetailsChange} />
                                    <span>Show Details</span>
                                </label>
                            </SidebarMenuItem>
                            <SidebarMenuItem className="ml-1 mt-2">
                                <Button variant="outline" size="sm" onClick={onExport} className="w-full">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export SVG
                                </Button>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                <SidebarGroupLabel>Identity Relations</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem className="ml-1">
                            <div className="flex flex-col gap-1 text-xs">
                                {IDENTITY_RELATION_LEGEND.map((item) => (
                                    <div key={item.symbol} className="flex items-center gap-2">
                                        <span className="font-mono bg-indigo-50 text-indigo-600 rounded px-1.5 py-0.5 min-w-8 text-center">
                                            {item.symbol}
                                        </span>
                                        <span className="text-muted-foreground">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
                {conformanceData && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Conformance</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem className="ml-1">
                                    <div className="flex items-center gap-2 text-sm">
                                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                                        <span className="font-medium">
                                            Fitness: {(conformanceData.fitness * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </SidebarMenuItem>
                                <SidebarMenuItem className="ml-1">
                                    <div className="flex items-center gap-2 text-sm">
                                        <ShieldCheck className="h-4 w-4 text-orange-600" />
                                        <span className="font-medium">
                                            Precision: {(conformanceData.precision * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
        </Sidebar>
    );
};

export default OcptSidebar;
