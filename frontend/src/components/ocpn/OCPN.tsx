import { useCallback, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Activity, Maximize2 } from 'lucide-react';
import { Button, buttonVariants } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import OcpnRendering, { OcpnVizParams } from '~/components/ocpn/OcpnRendering';
import { RustOcpnData } from '~/types/ocpn.types';

interface OCPNProps {
    data: RustOcpnData;
    params: OcpnVizParams;
    colorMap: Record<string, string>;
    isExiting?: boolean;
}

const OCPN: React.FC<OCPNProps> = ({ data, params, colorMap, isExiting }) => {
    const fitViewRef = useRef<(() => void) | null>(null);

    const handleFitReady = useCallback((fit: () => void) => {
        fitViewRef.current = fit;
    }, []);

    const handleFit = useCallback(() => {
        fitViewRef.current?.();
    }, []);

    return (
        <TooltipProvider>
            <main className="flex-1 flex flex-col relative bg-slate-50/30 min-h-0 min-w-0">
                <header className="h-14 border-b border-slate-200 flex items-center justify-end px-6 bg-white shadow-sm z-20 shrink-0">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`${buttonVariants({ variant: 'ghost', size: 'icon' })} h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg`}
                                onClick={handleFit}
                            >
                                <Maximize2 className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Fit to Screen</TooltipContent>
                    </Tooltip>
                </header>
                <div className="flex-1 p-6 overflow-hidden min-h-0 min-w-0 relative">
                    <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden relative">
                        {isExiting ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-50">
                                <Activity className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                                <p className="text-sm font-semibold text-slate-600 tracking-wide">Loading Pipeline...</p>
                            </div>
                        ) : (
                            <ReactFlowProvider>
                                <div className="absolute inset-0">
                                    <OcpnRendering
                                        data={data}
                                        params={params}
                                        colorMap={colorMap}
                                        onFitReady={handleFitReady}
                                    />
                                </div>
                            </ReactFlowProvider>
                        )}
                    </div>
                </div>
            </main>
        </TooltipProvider>
    );
};

export default OCPN;
