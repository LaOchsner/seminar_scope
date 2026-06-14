import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

interface DeviationSidebarProps {
    open: boolean;
    onToggle: () => void;
    labelA: string;
    labelB: string;
    objectTypesA: string[];
    objectTypesB: string[];
    selectedOtA: string;
    selectedOtB: string;
    onSelectOtA: (ot: string) => void;
    onSelectOtB: (ot: string) => void;
}

const PANEL_WIDTH = 'w-64';

const DeviationSidebar: React.FC<DeviationSidebarProps> = ({
    open,
    onToggle,
    labelA,
    labelB,
    objectTypesA,
    objectTypesB,
    selectedOtA,
    selectedOtB,
    onSelectOtA,
    onSelectOtB,
}) => {
    return (
        <div
            className={`absolute right-0 top-0 h-full flex z-10 transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : 'translate-x-64'}`}
        >
            <button
                onClick={onToggle}
                className="self-start mt-4 flex items-center justify-center w-6 h-8 rounded-l-md border border-r-0 bg-background shadow-md hover:bg-muted transition-colors"
                title={open ? 'Collapse sidebar' : 'Expand sidebar'}
            >
                {open ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>

            <div className={`${PANEL_WIDTH} h-full bg-background border-l shadow-lg flex flex-col overflow-hidden`}>
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
                    <div className="flex flex-col gap-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Object Types
                        </p>

                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Left ({labelA})</span>
                            <Select value={selectedOtA} onValueChange={onSelectOtA}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select object type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {objectTypesA.map((ot) => (
                                        <SelectItem key={ot} value={ot}>
                                            {ot}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Right ({labelB})</span>
                            <Select value={selectedOtB} onValueChange={onSelectOtB}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select object type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {objectTypesB.map((ot) => (
                                        <SelectItem key={ot} value={ot}>
                                            {ot}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Legend
                        </p>
                        <div className="flex flex-col gap-1.5 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 rounded-sm shrink-0 bg-blue-500" />
                                <span>Only in {labelA}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 rounded-sm shrink-0 bg-orange-500" />
                                <span>Only in {labelB}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 rounded-sm shrink-0 bg-[#b1b1b7] opacity-40" />
                                <span className="text-muted-foreground">Shared</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviationSidebar;
