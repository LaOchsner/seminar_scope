import { memo, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { Loader2 } from 'lucide-react';
import BaseMinerNode from '~/components/explore/miner/BaseMinerNode';
import {
    useGetConformanceAbstractionAbstraction,
    useGetConformanceExtendedOcptAbstraction,
    useGetConformanceExtendedOcptExtendedOcpt,
    useGetConformanceExtendedOcptOcel,
    useGetConformanceOcptAbstraction,
    useGetConformanceOcptOcel,
    useGetConformanceOcptOcpt,
} from '~/services/queries';
import type { BaseExploreNodeAsset } from '~/types/explore/nodeData/baseNodeData';
import { MinerNode } from '~/types/explore/nodes';
import type { AssetType } from '~/types/files.types';

type AssetKind = 'ocpt' | 'extended_ocpt' | 'ocel' | 'abstraction';

function assetKind(type: AssetType): AssetKind | null {
    if (type === 'ocptFile' || type === 'ocptAsset') return 'ocpt';
    if (type === 'identityOcptAsset') return 'extended_ocpt';
    if (type === 'ocelFile' || type === 'ocelAsset') return 'ocel';
    if (type === 'abstractionAsset') return 'abstraction';
    return null;
}

type ConformanceMode =
    | 'ocpt-ocel'
    | 'ocpt-abstraction'
    | 'ocpt-ocpt'
    | 'extended-ocel'
    | 'extended-abstraction'
    | 'extended-extended'
    | 'abstraction-abstraction';

interface ConformanceInputs {
    mode: ConformanceMode;
    a: BaseExploreNodeAsset;
    b: BaseExploreNodeAsset;
}

function detectConformance(
    asset1: BaseExploreNodeAsset,
    asset2: BaseExploreNodeAsset
): ConformanceInputs | null {
    const k1 = assetKind(asset1.type);
    const k2 = assetKind(asset2.type);
    if (!k1 || !k2) return null;

    // Normalize so the "model" side (ocpt/extended_ocpt) is always `a`
    const [model, log, mk, lk] =
        k1 === 'ocpt' || k1 === 'extended_ocpt'
            ? [asset1, asset2, k1, k2]
            : [asset2, asset1, k2, k1];

    if (mk === 'ocpt') {
        if (lk === 'ocel') return { mode: 'ocpt-ocel', a: model, b: log };
        if (lk === 'abstraction') return { mode: 'ocpt-abstraction', a: model, b: log };
        if (lk === 'ocpt') return { mode: 'ocpt-ocpt', a: model, b: log };
    }
    if (mk === 'extended_ocpt') {
        if (lk === 'ocel') return { mode: 'extended-ocel', a: model, b: log };
        if (lk === 'abstraction') return { mode: 'extended-abstraction', a: model, b: log };
        if (lk === 'extended_ocpt') return { mode: 'extended-extended', a: model, b: log };
    }

    // Both abstractions — order doesn't matter
    if (k1 === 'abstraction' && k2 === 'abstraction')
        return { mode: 'abstraction-abstraction', a: asset1, b: asset2 };

    return null;
}

const ConformanceMinerNode = memo<NodeProps<MinerNode>>((node) => {
    const primaryAsset = useMemo(
        () => node.data.assets.find((a) => a.io === 'input' && (!a.inputHandle || a.inputHandle === 'target')) ?? null,
        [node.data.assets]
    );

    const secondaryAsset = useMemo(
        () => node.data.assets.find((a) => a.io === 'input' && a.inputHandle === 'conformanceTargetSecondary') ?? null,
        [node.data.assets]
    );

    const detected = useMemo(
        () => (primaryAsset && secondaryAsset ? detectConformance(primaryAsset, secondaryAsset) : null),
        [primaryAsset, secondaryAsset]
    );

    const { data: ocptOcelResult, isLoading: l1 } = useGetConformanceOcptOcel(
        detected?.mode === 'ocpt-ocel' ? detected.a.id : null,
        detected?.mode === 'ocpt-ocel' ? detected.b.id : null
    );
    const { data: ocptAbsResult, isLoading: l2 } = useGetConformanceOcptAbstraction(
        detected?.mode === 'ocpt-abstraction' ? detected.a.id : null,
        detected?.mode === 'ocpt-abstraction' ? detected.b.id : null
    );
    const { data: ocptOcptResult, isLoading: l3 } = useGetConformanceOcptOcpt(
        detected?.mode === 'ocpt-ocpt' ? detected.a.id : null,
        detected?.mode === 'ocpt-ocpt' ? detected.b.id : null
    );
    const { data: extOcelResult, isLoading: l4 } = useGetConformanceExtendedOcptOcel(
        detected?.mode === 'extended-ocel' ? detected.a.id : null,
        detected?.mode === 'extended-ocel' ? detected.b.id : null
    );
    const { data: extAbsResult, isLoading: l5 } = useGetConformanceExtendedOcptAbstraction(
        detected?.mode === 'extended-abstraction' ? detected.a.id : null,
        detected?.mode === 'extended-abstraction' ? detected.b.id : null
    );
    const { data: extExtResult, isLoading: l6 } = useGetConformanceExtendedOcptExtendedOcpt(
        detected?.mode === 'extended-extended' ? detected.a.id : null,
        detected?.mode === 'extended-extended' ? detected.b.id : null
    );
    const { data: absAbsResult, isLoading: l7 } = useGetConformanceAbstractionAbstraction(
        detected?.mode === 'abstraction-abstraction' ? detected.a.id : null,
        detected?.mode === 'abstraction-abstraction' ? detected.b.id : null
    );

    const result = ocptOcelResult ?? ocptAbsResult ?? ocptOcptResult ?? extOcelResult ?? extAbsResult ?? extExtResult ?? absAbsResult;
    const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7;

    return (
        <BaseMinerNode
            {...node}
            title="Conformance"
            iconName="radar"
            handleOptions={[
                { id: 'target', position: Position.Left, type: 'target' as const },
                { id: 'source', position: Position.Right, type: 'source' as const },
            ]}
            secondaryHandles={[
                {
                    id: 'conformanceTargetSecondary',
                    label: 'Second Input',
                    hintTypes: ['ocptAsset', 'ocptFile', 'identityOcptAsset', 'ocelFile', 'ocelAsset', 'abstractionAsset'],
                },
            ]}
            dropdownOptions={[]}
            isLoading={false}
        >
            {primaryAsset && secondaryAsset && (
                <div className="mt-2 border-t pt-2">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Computing conformance...
                        </div>
                    ) : result ? (
                        <div className="flex flex-col gap-1 text-xs">
                            <span className="font-medium">Fitness: {(result.fitness * 100).toFixed(1)}%</span>
                            <span className="font-medium">Precision: {(result.precision * 100).toFixed(1)}%</span>
                        </div>
                    ) : null}
                </div>
            )}
        </BaseMinerNode>
    );
});

export default ConformanceMinerNode;
