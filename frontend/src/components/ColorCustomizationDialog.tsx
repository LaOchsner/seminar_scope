import React, { useMemo } from 'react';
import { RefreshCcw } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { ScrollArea } from '~/components/ui/scroll-area';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { getDeterministicColor } from '~/lib/colors';
import { FileExploreNodeData } from '~/types/explore/nodeData/fileNodeData';

interface ColorCustomizationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    nodeId: string;
}

export const ColorCustomizationDialog: React.FC<ColorCustomizationDialogProps> = ({ isOpen, onClose, nodeId }) => {
    // 1. Reactive subscription: Updates automatically if the store changes
    const node = useExploreFlowStore((state) => state.nodes.find((n) => n.id === nodeId));
    const { setNodeColor, getColorForNode } = useExploreFlowStore();

    // 2. Derive list strictly from the Node's existing Color Map
    const objectTypes = useMemo(() => {
        if (!node || !node.data) return [];

        // Cast to expected type to access colorMap
        const data = node.data as FileExploreNodeData;
        const map = data.colorMap || {};

        // Return the keys (Object Types) present in the map
        return Object.keys(map).sort();
    }, [node]);

    const handleReset = (type: string) => {
        setNodeColor(nodeId, type, getDeterministicColor(type));
    };

    if (!node) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Customize Colors</DialogTitle>
                    <DialogDescription>Modify colors for specific object types in this node.</DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[300px] w-full pr-4">
                    <div className="flex flex-col gap-3 py-2">
                        {objectTypes.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8 px-4">
                                <p>No object types found.</p>
                                <p className="text-xs mt-2 opacity-75">(The color map is currently empty.)</p>
                            </div>
                        ) : (
                            objectTypes.map((type) => (
                                <div
                                    key={type}
                                    className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative h-8 w-8 overflow-hidden rounded-full border shadow-sm cursor-pointer hover:scale-105 transition-transform">
                                            {/* Live update of color from store */}
                                            <input
                                                type="color"
                                                value={getColorForNode(nodeId, type)}
                                                onChange={(e) => setNodeColor(nodeId, type, e.target.value)}
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                            />
                                        </div>
                                        <Label className="text-sm font-medium cursor-pointer">{type}</Label>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        onClick={() => handleReset(type)}
                                        title="Reset to default"
                                    >
                                        <RefreshCcw className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
                <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={onClose}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
