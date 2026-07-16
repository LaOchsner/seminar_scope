import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '~/components/ui/button';
import { SidebarProvider } from '~/components/ui/sidebar';
import BreadcrumbNav from '~/components/BreadcrumbNav';
import OCPN from '~/components/ocpn/OCPN';
import OcpnSidebar, { OcpnIdentityRelationSummary } from '~/components/ocpn/OcpnSidebar';
import { getArcId, OcpnVizParams, toFlowId } from '~/components/ocpn/OcpnRendering';
import { getPlaceObjectTypes } from '~/lib/ocpn/ocpnGraph';
import { useGetIdentityOcpt } from '~/services/queries';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { FileExploreNodeData } from '~/types/explore/nodeData/fileNodeData';
import { RustOcpnData } from '~/types/ocpn.types';

const property = (source: unknown, key: string): unknown => {
    if (!source || typeof source !== 'object') return undefined;
    return (source as Record<string, unknown>)[key];
};

const toStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.map(String);
};

const identityKind = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';

    const entries = Object.entries(value as Record<string, unknown>);
    const [kind, payload] = entries[0] ?? [];
    if (!kind) return '';
    return payload === null || payload === undefined ? kind : `${kind}:${String(payload)}`;
};

const canonicalKind = (kind: string): string => {
    const [rawKind, payload] = kind.split(':', 2);
    const normalized = rawKind.toLowerCase().replace(/[_\-\s]/g, '');

    if (normalized === 'sync') return 'sync';
    if (normalized === 'subsetsync') return 'subsetSync';
    if (normalized === 'subsetsyncpartition') return 'subsetSyncPartition';
    if (normalized === 'subsetsyncoverlap') return 'subsetSyncOverlap';
    if (normalized === 'impconcurrent') return 'impConcurrent';
    if (normalized === 'impordered') return 'impOrdered';
    if (normalized === 'impbatch') return payload ? `impBatch:${payload}` : 'impBatch';
    if (normalized === 'objectsplit') return 'objectSplit';
    if (normalized === 'objectmerge') return 'objectMerge';
    return kind;
};

const isIdentityRelationKind = (kind: string): boolean => {
    const normalized = canonicalKind(kind).toLowerCase().replace(/[_\-\s:]/g, '');
    return (
        normalized === 'sync' ||
        normalized === 'subsetsync' ||
        normalized === 'subsetsyncpartition' ||
        normalized === 'subsetsyncoverlap' ||
        normalized === 'impconcurrent' ||
        normalized === 'impordered' ||
        normalized.startsWith('impbatch') ||
        normalized === 'objectsplit' ||
        normalized === 'objectmerge'
    );
};

const getIdentityRelation = (item: unknown): Record<string, unknown> | null => {
    const relation = property(property(item, 'properties'), 'identity_relation');
    return relation && typeof relation === 'object' ? (relation as Record<string, unknown>) : null;
};

const stringProperty = (source: unknown, key: string): string | null => {
    const value = property(source, key);
    return typeof value === 'string' && value.length > 0 ? value : null;
};

const relationKindKey = (relation: Record<string, unknown>) => {
    const kind = canonicalKind(identityKind(relation.kind));
    const batchSize = property(relation, 'batchSize') ?? property(relation, 'batch_size');

    if (kind === 'impBatch' && batchSize !== undefined && batchSize !== null) {
        return `impBatch:${String(batchSize)}`;
    }

    return kind;
};

const identityRelationKey = (relation: Record<string, unknown>) =>
    JSON.stringify({
        kind: relationKindKey(relation),
        left: toStringArray(relation.left).sort(),
        right: toStringArray(relation.right).sort(),
    });

const activityLabel = (transition: unknown): string | null => {
    if (!transition || typeof transition !== 'object') return null;
    const label = property(transition, 'label');
    const silent = property(transition, 'silent');
    return typeof label === 'string' && label.length > 0 && !silent ? label : null;
};

const collectRelationActivities = (data: RustOcpnData, relationId: string): string[] => {
    const nodeIds = new Set<string>();
    const adjacency = new Map<string, Set<string>>();

    const addEdge = (left: string, right: string) => {
        if (!adjacency.has(left)) adjacency.set(left, new Set());
        if (!adjacency.has(right)) adjacency.set(right, new Set());
        adjacency.get(left)?.add(right);
        adjacency.get(right)?.add(left);
    };

    const transitionIds = new Set((data.transitions ?? []).map((transition) => `t:${toFlowId(transition.id)}`));

    for (const place of data.places ?? []) {
        const relation = getIdentityRelation(place);
        if (relation && identityRelationKey(relation) === relationId) {
            nodeIds.add(`p:${toFlowId(place.id)}`);
        }
    }

    for (const transition of data.transitions ?? []) {
        const relation = getIdentityRelation(transition);
        if (relation && identityRelationKey(relation) === relationId) {
            nodeIds.add(`t:${toFlowId(transition.id)}`);
        }
    }

    for (const arc of data.arcs ?? []) {
        const source = `${arc.source.kind === 'place' ? 'p' : 't'}:${toFlowId(getArcId(arc.source))}`;
        const target = `${arc.target.kind === 'place' ? 'p' : 't'}:${toFlowId(getArcId(arc.target))}`;
        addEdge(source, target);

        const relation = getIdentityRelation(arc);
        if (relation && identityRelationKey(relation) === relationId) {
            nodeIds.add(source);
            nodeIds.add(target);
        }
    }

    const visited = new Set<string>();
    const queue = Array.from(nodeIds);
    for (const id of queue) visited.add(id);

    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const next of adjacency.get(current) ?? []) {
            if (visited.has(next)) continue;
            visited.add(next);
            queue.push(next);
        }
    }

    const activities = new Set<string>();
    for (const transition of data.transitions ?? []) {
        const id = `t:${toFlowId(transition.id)}`;
        if (!visited.has(id) || !transitionIds.has(id)) continue;
        const label = activityLabel(transition);
        if (label) activities.add(label);
    }

    return Array.from(activities).sort((a, b) => a.localeCompare(b));
};

const collectScopedActivities = (node: unknown): string[] => {
    const activities = new Set<string>();

    const visit = (current: unknown) => {
        if (!current || typeof current !== 'object') return;
        const obj = current as Record<string, unknown>;

        const leaf = property(current, 'Leaf');
        if (leaf && typeof leaf === 'object') {
            const label = property(leaf, 'activity_label');
            const activity = property(label, 'Activity');
            if (typeof activity === 'string') activities.add(activity);
            return;
        }

        const value = property(current, 'value');
        if (value && typeof value === 'object') {
            const activity = property(value, 'activity');
            if (typeof activity === 'string') activities.add(activity);
        }

        const children = Array.isArray(obj.children) ? obj.children : [];
        children.forEach(visit);

        const operator = property(current, 'Operator');
        if (operator && typeof operator === 'object') {
            const opChildren = property(operator, 'children');
            if (Array.isArray(opChildren)) opChildren.forEach(visit);
        }
    };

    visit(node);
    return Array.from(activities).sort((a, b) => a.localeCompare(b));
};

const collectScopedActivityMap = (ocpt: unknown): Map<string, string[]> => {
    const scoped = new Map<string, Set<string>>();

    const add = (relation: Record<string, unknown>, node: unknown) => {
        const id = identityRelationKey(relation);
        if (!scoped.has(id)) scoped.set(id, new Set());
        collectScopedActivities(node).forEach((activity) => scoped.get(id)?.add(activity));
    };

    const visit = (current: unknown) => {
        if (!current || typeof current !== 'object') return;
        const obj = current as Record<string, unknown>;

        const operator = property(current, 'Operator');
        if (operator && typeof operator === 'object') {
            const operatorType = property(operator, 'operator_type');
            const relation = property(operatorType, 'IdentityRelation');
            if (relation && typeof relation === 'object') {
                add(relation as Record<string, unknown>, current);
            }

            const children = property(operator, 'children');
            if (Array.isArray(children)) children.forEach(visit);
        }

        const value = property(current, 'value');
        if (value && typeof value === 'object') {
            const relations = property(value, 'identity');
            if (Array.isArray(relations)) {
                relations.forEach((relation) => {
                    if (relation && typeof relation === 'object') {
                        add(relation as Record<string, unknown>, current);
                    }
                });
            }
        }

        const children = Array.isArray(obj.children) ? obj.children : [];
        children.forEach(visit);
        const root = property(current, 'root') ?? property(current, 'hierarchy');
        if (root) visit(root);
    };

    visit(ocpt);

    return new Map(
        Array.from(scoped.entries()).map(([id, activities]) => [
            id,
            Array.from(activities).sort((a, b) => a.localeCompare(b)),
        ])
    );
};

const collectScopedActivityMapFromProperties = (properties: unknown): Map<string, string[]> => {
    const scoped = new Map<string, string[]>();
    const scopes = property(properties, 'identity_relation_scopes');
    if (!Array.isArray(scopes)) return scoped;

    scopes.forEach((scope) => {
        const relation = property(scope, 'relation');
        const activities = property(scope, 'activities');
        if (!relation || typeof relation !== 'object' || !Array.isArray(activities)) return;

        scoped.set(
            identityRelationKey(relation as Record<string, unknown>),
            activities.map(String).sort((a, b) => a.localeCompare(b))
        );
    });

    return scoped;
};

const mergeScopedActivityMaps = (...maps: Map<string, string[]>[]) => {
    const merged = new Map<string, Set<string>>();

    maps.forEach((map) => {
        map.forEach((activities, relationId) => {
            if (!merged.has(relationId)) merged.set(relationId, new Set());
            activities.forEach((activity) => merged.get(relationId)?.add(activity));
        });
    });

    return new Map(
        Array.from(merged.entries()).map(([relationId, activities]) => [
            relationId,
            Array.from(activities).sort((a, b) => a.localeCompare(b)),
        ])
    );
};

const collectIdentityRelations = (data: RustOcpnData | null, scopedActivityMap: Map<string, string[]>): OcpnIdentityRelationSummary[] => {
    if (!data) return [];

    const relations = new Map<string, OcpnIdentityRelationSummary>();
    const items: unknown[] = [...(data.places ?? []), ...(data.transitions ?? []), ...(data.arcs ?? [])];

    for (const item of items) {
        const relation = getIdentityRelation(item);
        if (!relation) continue;
        const kind = canonicalKind(identityKind(relation.kind));
        if (!isIdentityRelationKind(kind)) continue;

        const id = identityRelationKey(relation);
        if (relations.has(id)) continue;

        relations.set(id, {
            id,
            kind,
            left: toStringArray(relation.left),
            right: toStringArray(relation.right),
            connectedActivities: [],
            scopedActivities: [],
        });
    }

    return Array.from(relations.values())
        .map((relation) => ({
            ...relation,
            connectedActivities: collectRelationActivities(data, relation.id),
            scopedActivities: scopedActivityMap.get(relation.id) ?? [],
        }))
        .sort((a, b) => a.kind.localeCompare(b.kind));
};

export default function OcpnViewer({ nodeId: propNodeId }: { nodeId?: string }) {
    const navigate = useNavigate();
    const params = useParams<{ nodeId: string }>();
    const nodeId = propNodeId || params.nodeId;
    const [isExiting, setIsExiting] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['objects', 'identity', 'styling']));
    const [visibleObjectTypes, setVisibleObjectTypes] = useState<Set<string>>(new Set());
    const [vizParams, setVizParams] = useState<OcpnVizParams>({
        hSpacing: 80,
        vSpacing: 10,
        nodeSize: 18,
        labelSize: 11,
    });

    const { getNode } = useExploreFlowStore();
    const nodes = useExploreFlowStore((state) => state.nodes);
    const edges = useExploreFlowStore((state) => state.edges);
    const node = nodeId ? getNode(nodeId) : undefined;
    const nodeData = node?.data as FileExploreNodeData | undefined;
    const rawData = (nodeData?.processedData as RustOcpnData) || null;
    const colorMap = (nodeData?.colorMap as Record<string, string>) || {};
    const sourceExtendedOcptIdFromPayload = stringProperty(rawData?.properties, 'source_extended_ocpt_id');
    const sourceExtendedOcptAsset = useMemo(() => {
        const direct = nodeData?.assets?.find((asset) => asset.type === 'identityOcptAsset');
        if (direct) return direct;

        if (!nodeId) return undefined;
        const incoming = edges.filter((edge) => edge.target === nodeId);
        for (const edge of incoming) {
            const sourceNode = nodes.find((candidate) => candidate.id === edge.source);
            const sourceAsset = sourceNode?.data?.assets?.find((asset) => asset.type === 'identityOcptAsset');
            if (sourceAsset) return sourceAsset;
        }

        const identityOcptAssets = nodes
            .flatMap((candidate) => candidate.data?.assets ?? [])
            .filter((asset) => asset.type === 'identityOcptAsset');
        if (identityOcptAssets.length === 1) return identityOcptAssets[0];

        return undefined;
    }, [edges, nodeData?.assets, nodeId, nodes]);
    const sourceExtendedOcptId = sourceExtendedOcptIdFromPayload ?? sourceExtendedOcptAsset?.id ?? null;
    const { data: sourceExtendedOcpt } = useGetIdentityOcpt(sourceExtendedOcptId, Boolean(sourceExtendedOcptId));

    const allObjectTypes = useMemo(
        () =>
            rawData?.object_types ??
            Array.from(new Set(rawData?.places?.flatMap((place) => getPlaceObjectTypes(place)) || [])),
        [rawData]
    );
    const metadataScopedActivityMap = useMemo(
        () => collectScopedActivityMapFromProperties(rawData?.properties),
        [rawData?.properties]
    );
    const sourceScopedActivityMap = useMemo(() => collectScopedActivityMap(sourceExtendedOcpt?.ocpt), [sourceExtendedOcpt]);
    const scopedActivityMap = useMemo(
        () => mergeScopedActivityMaps(metadataScopedActivityMap, sourceScopedActivityMap),
        [metadataScopedActivityMap, sourceScopedActivityMap]
    );
    const identityRelations = useMemo(() => collectIdentityRelations(rawData, scopedActivityMap), [rawData, scopedActivityMap]);

    useEffect(() => {
        if (allObjectTypes.length > 0 && visibleObjectTypes.size === 0) {
            setVisibleObjectTypes(new Set(allObjectTypes));
        }
    }, [allObjectTypes, visibleObjectTypes.size]);

    const filteredData = useMemo(() => {
        if (!rawData?.places) return null;

        const places = rawData.places.filter((p) =>
            visibleObjectTypes.has(p.object_type) ||
            getPlaceObjectTypes(p).some((objectType) => visibleObjectTypes.has(objectType))
        );
        const placeIds = new Set(places.map((p) => toFlowId(p.id)));

        const candidateArcs = (rawData.arcs || []).filter((arc) => {
            const src = toFlowId(getArcId(arc.source));
            const tgt = toFlowId(getArcId(arc.target));
            return placeIds.has(src) || placeIds.has(tgt);
        });

        const connectedNodeIds = new Set<string>();
        candidateArcs.forEach((arc) => {
            connectedNodeIds.add(toFlowId(getArcId(arc.source)));
            connectedNodeIds.add(toFlowId(getArcId(arc.target)));
        });

        const transitions = (rawData.transitions || []).filter((t) => connectedNodeIds.has(toFlowId(t.id)));
        const transitionIds = new Set(transitions.map((t) => toFlowId(t.id)));
        const validNodeIds = new Set([...placeIds, ...transitionIds]);
        const arcs = candidateArcs.filter(
            (arc) => validNodeIds.has(toFlowId(getArcId(arc.source))) && validNodeIds.has(toFlowId(getArcId(arc.target)))
        );

        return { ...rawData, places, transitions, arcs };
    }, [rawData, visibleObjectTypes]);

    const toggleSection = (id: string) => {
        const next = new Set(expandedSections);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedSections(next);
    };

    const toggleObjectType = (type: string) => {
        const next = new Set(visibleObjectTypes);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        setVisibleObjectTypes(next);
    };

    const handleBackToPipeline = () => {
        setIsExiting(true);
        setTimeout(() => navigate('/data/pipeline/explore'), 50);
    };

    if (!rawData?.places) {
        return (
            <SidebarProvider>
                <div className="flex flex-col h-screen w-screen overflow-hidden">
                    <BreadcrumbNav />
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-50 text-slate-500 font-medium">
                        <AlertTriangle className="w-10 h-10 text-amber-500" />
                        <h2 className="text-lg font-bold text-slate-700">Incomplete Data</h2>
                        <p className="text-sm text-slate-500 max-w-md text-center">
                            The backend payload is missing or not formatted correctly. Ensure processedData contains
                            places and transitions.
                        </p>
                        <Button variant="outline" onClick={handleBackToPipeline}>
                            Return to Pipeline
                        </Button>
                    </div>
                </div>
            </SidebarProvider>
        );
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-svh flex-1 flex-col bg-white text-slate-900 font-sans overflow-hidden">
                <BreadcrumbNav />
                <div className="flex flex-1 min-h-0 w-full overflow-hidden">
                    <OCPN data={filteredData!} params={vizParams} colorMap={colorMap} isExiting={isExiting} />
                </div>
            </div>
            <OcpnSidebar
                objectTypes={allObjectTypes}
                colorMap={colorMap}
                visibleObjectTypes={visibleObjectTypes}
                expandedSections={expandedSections}
                params={vizParams}
                identityRelations={identityRelations}
                isExiting={isExiting}
                onToggleSection={toggleSection}
                onToggleObjectType={toggleObjectType}
                onParamsChange={setVizParams}
                onBackToPipeline={handleBackToPipeline}
            />
        </SidebarProvider>
    );
}
