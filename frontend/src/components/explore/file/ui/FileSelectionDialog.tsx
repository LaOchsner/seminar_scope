import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import FileShowcase from '~/components/explore/file/ui/FileShowcase';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { useFileDialogStore, useStoredFiles } from '~/stores/store';
import { generateColorMap, propagateMapDownstream } from '~/lib/explore/flowActions';
import { refocusPipeline } from '~/lib/explore/refocusPipeline';
import { BaseExploreNodeAsset } from '~/types/explore/nodeData/baseNodeData';
import { ExtendedFile } from '~/types/files.types';

interface FileSelectionDialogProps {
    isOpen: boolean;
}

const FileSelectionDialog: React.FC<FileSelectionDialogProps> = ({ isOpen }) => {
    const [filteredFiles, setFilteredFiles] = useState<ExtendedFile[]>([]);
    const { dialogNodeId, closeDialog } = useFileDialogStore();
    const { files } = useStoredFiles();
    const { getNode, updateNodeData } = useExploreFlowStore();

    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                document.body.style.pointerEvents = '';
                document.body.style.overflow = '';
                document.body.removeAttribute('data-scroll-locked');
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useMemo(() => {
        if (!dialogNodeId) return;
        const node = getNode(dialogNodeId);
        if (!node) return;
        const validFiles = files.filter((file) => node.data.allowedAssetTypes.includes(file.fileType));
        setFilteredFiles(validFiles);
    }, [files, dialogNodeId, getNode]);

    const handleFileSelect = useCallback(
        (file: ExtendedFile) => {
            if (dialogNodeId) {
                const node = getNode(dialogNodeId);
                const hasExistingOutput = node?.data.assets.some((a) => a.io === 'output');

                if (hasExistingOutput) {
                    refocusPipeline(dialogNodeId);
                }

                const newAsset: BaseExploreNodeAsset = {
                    id: file.id,
                    name: file.name,
                    type: file.fileType,
                    origin: 'preprocessed',
                    io: 'output',
                };

                // ---Generate Color Map ---
                const objectTypes: string[] = (file as any).objectTypes || (file as any).metadata?.objectTypes || [];
                const generatedColorMap = generateColorMap(objectTypes);

                // --- Update Source Node ---
                updateNodeData(dialogNodeId, (prev) => ({
                    assets: [newAsset],
                    colorMap: generatedColorMap,
                }));

                // --- FIX: Wait 10ms for state to settle, THEN propagate ---
                setTimeout(() => {
                    propagateMapDownstream(dialogNodeId, generatedColorMap);
                }, 10);
            }
            closeDialog();
        },
        [dialogNodeId, updateNodeData, closeDialog, getNode]
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Choose a File from your Data</DialogTitle>
                    <DialogDescription>If you want to upload a new file, please visit the data page.</DialogDescription>
                </DialogHeader>
                <div className="border-y divide-y">
                    {filteredFiles.map((file) => (
                        <FileShowcase key={file.id} file={file} onFileSelect={handleFileSelect} />
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default FileSelectionDialog;
