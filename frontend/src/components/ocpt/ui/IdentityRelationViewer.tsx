import { useMemo } from 'react';
import { ScaleOrdinal } from 'd3';
import { HierarchyPointNode } from '@visx/hierarchy/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { isExtendedProcessTreeOperatorNode, isIdentityOperatorApi } from '~/lib/ocpt/ocptGuards';
import * as Ocpt from '~/types/ocpt/ocpt.types';

interface IdentityRelationViewerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    node: HierarchyPointNode<Ocpt.Node> | null;
    colorScale: ScaleOrdinal<string, string, never>;
}

const OPERATOR_LABELS: Record<string, string> = {
    sequence: 'Sequence (→)',
    parallel: 'Parallel (∧)',
    loop: 'Loop (↺)',
    xor: 'XOR (×)',
};

const KIND_LABELS: Record<Ocpt.IdentityRelationKind, string> = {
    sync: 'Synchronization',
    impConcurrent: 'Implicit Concurrency',
    tempImp: 'Temporal Implication',
};

const KIND_SYMBOLS: Record<Ocpt.IdentityRelationKind, string> = {
    sync: '=',
    impConcurrent: '⇒‖',
    tempImp: '⇒→',
};

const SVG_W = 420;
const SVG_H = 300;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const LAYOUT_RADIUS = Math.min(CX, CY) - 52;
const NODE_RX = 36;
const NODE_RY = 18;

// Perpendicular half-gap between the two lines of a double-line edge
const LINE_OFFSET = 3;
// Arrowhead dimensions
const ARROW_LEN = 10;
const ARROW_HALF = 5;
const EDGE_COLOR = '#374151';

type OtPosition = { ot: string; x: number; y: number };

function centroid(positions: OtPosition[]) {
    const x = positions.reduce((s, p) => s + p.x, 0) / positions.length;
    const y = positions.reduce((s, p) => s + p.y, 0) / positions.length;
    return { x, y };
}

// Distance from ellipse center to its boundary in direction (nx, ny)
function ellipseBoundaryDist(nx: number, ny: number) {
    return 1 / Math.sqrt((nx / NODE_RX) ** 2 + (ny / NODE_RY) ** 2);
}

interface RelationEdgeProps {
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    kind: 'sync' | 'impConcurrent';
    // Whether the endpoints are OT node centers (true) or free-floating centroids (false)
    p1IsNode?: boolean;
    p2IsNode?: boolean;
}

const RelationEdge: React.FC<RelationEdgeProps> = ({ p1, p2, kind, p1IsNode = true, p2IsNode = true }) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return null;

    const nx = dx / len; // unit vector p1→p2
    const ny = dy / len;
    const px = -ny; // perpendicular (left of direction)
    const py = nx;

    // Adjust start/end to sit on ellipse boundary (or leave as-is for centroids)
    const startOffset = p1IsNode ? ellipseBoundaryDist(nx, ny) : 0;
    const endOffset = p2IsNode ? ellipseBoundaryDist(nx, ny) : 0;

    // Base edge endpoints (before accounting for arrowheads)
    const sx = p1.x + nx * startOffset;
    const sy = p1.y + ny * startOffset;
    const ex = p2.x - nx * endOffset;
    const ey = p2.y - ny * endOffset;

    // For impConcurrent: arrow at end only. For sync: arrows at both ends.
    const arrowAtEnd = true;
    const arrowAtStart = kind === 'sync';

    // Line endpoints — pulled back from arrowhead bases
    const lsx = sx + (arrowAtStart ? nx * ARROW_LEN : 0);
    const lsy = sy + (arrowAtStart ? ny * ARROW_LEN : 0);
    const lex = ex - (arrowAtEnd ? nx * ARROW_LEN : 0);
    const ley = ey - (arrowAtEnd ? ny * ARROW_LEN : 0);

    // The two parallel line paths (offset ±LINE_OFFSET perpendicular)
    const lines = ([-1, 1] as const).map((sign) => {
        const ox = px * LINE_OFFSET * sign;
        const oy = py * LINE_OFFSET * sign;
        return (
            <line
                key={sign}
                x1={lsx + ox}
                y1={lsy + oy}
                x2={lex + ox}
                y2={ley + oy}
                stroke={EDGE_COLOR}
                strokeWidth={1.5}
            />
        );
    });

    // Arrowhead polygon points: tip at `tip`, base at tip - nx*ARROW_LEN ± px*ARROW_HALF
    const makeArrow = (tipX: number, tipY: number, dirX: number, dirY: number) => {
        const b1x = tipX - dirX * ARROW_LEN + px * ARROW_HALF;
        const b1y = tipY - dirY * ARROW_LEN + py * ARROW_HALF;
        const b2x = tipX - dirX * ARROW_LEN - px * ARROW_HALF;
        const b2y = tipY - dirY * ARROW_LEN - py * ARROW_HALF;
        return `${tipX},${tipY} ${b1x},${b1y} ${b2x},${b2y}`;
    };

    return (
        <g>
            {lines}
            {arrowAtEnd && (
                <polygon points={makeArrow(ex, ey, nx, ny)} fill={EDGE_COLOR} />
            )}
            {arrowAtStart && (
                <polygon points={makeArrow(sx, sy, -nx, -ny)} fill={EDGE_COLOR} />
            )}
        </g>
    );
};

const IdentityRelationViewer: React.FC<IdentityRelationViewerProps> = ({ open, onOpenChange, node, colorScale }) => {
    const value = node?.data.value;

    const { operator, objectTypes, identityRelations } = useMemo(() => {
        if (!value) return { operator: null, objectTypes: [], identityRelations: [] };

        // Collect OTs from the identity relations' left/right arrays — these are the types actually
        // involved in relations at this operator, regardless of what the intersection produced.
        const otsFromRelations = (relations: Ocpt.IdentityRelation[]) => {
            const s = new Set<string>();
            relations.forEach((r) => {
                r.left.forEach((ot) => s.add(ot));
                r.right.forEach((ot) => s.add(ot));
            });
            return s;
        };

        if (isExtendedProcessTreeOperatorNode(value)) {
            const relations = value.identity ?? [];
            const otSet = otsFromRelations(relations);
            // Also include any OTs from the intersection that aren't in relations
            value.ots.forEach((ot) => otSet.add(ot.ot));
            return {
                operator: value.operator,
                objectTypes: Array.from(otSet),
                identityRelations: relations,
            };
        }
        if (isIdentityOperatorApi(value)) {
            const relations = value.identity ?? [];
            return {
                operator: value.operator,
                objectTypes: Array.from(otsFromRelations(relations)),
                identityRelations: relations,
            };
        }
        return { operator: null, objectTypes: [], identityRelations: [] };
    }, [value]);

    const otNodes = useMemo(() => {
        if (objectTypes.length === 0) return [];
        if (objectTypes.length === 1) return [{ ot: objectTypes[0], x: CX, y: CY }];
        return objectTypes.map((ot, i) => {
            const angle = (2 * Math.PI * i) / objectTypes.length - Math.PI / 2;
            return { ot, x: CX + LAYOUT_RADIUS * Math.cos(angle), y: CY + LAYOUT_RADIUS * Math.sin(angle) };
        });
    }, [objectTypes]);

    const posMap = useMemo(() => {
        const m = new Map<string, OtPosition>();
        otNodes.forEach((n) => m.set(n.ot, n));
        return m;
    }, [otNodes]);

    const visibleRelations = identityRelations.filter(
        (r): r is Ocpt.IdentityRelation & { kind: 'sync' | 'impConcurrent' } =>
            r.kind === 'sync' || r.kind === 'impConcurrent'
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>
                        Identity Relations — {operator ? (OPERATOR_LABELS[operator] ?? operator) : ''}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex gap-4" style={{ height: '340px' }}>
                    <div className="flex-1 border rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
                        {objectTypes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No object types at this node.</p>
                        ) : (
                            <svg width={SVG_W} height={SVG_H}>
                                {/* Edges drawn first so nodes render on top */}
                                {visibleRelations.map((rel, i) => {
                                    const leftNodes = rel.left.map((ot) => posMap.get(ot)).filter(Boolean) as OtPosition[];
                                    const rightNodes = rel.right.map((ot) => posMap.get(ot)).filter(Boolean) as OtPosition[];
                                    if (leftNodes.length === 0 || rightNodes.length === 0) return null;

                                    const p1 = centroid(leftNodes);
                                    const p2 = centroid(rightNodes);
                                    const p1IsNode = leftNodes.length === 1;
                                    const p2IsNode = rightNodes.length === 1;

                                    return (
                                        <RelationEdge
                                            key={i}
                                            p1={p1}
                                            p2={p2}
                                            kind={rel.kind}
                                            p1IsNode={p1IsNode}
                                            p2IsNode={p2IsNode}
                                        />
                                    );
                                })}

                                {otNodes.map(({ ot, x, y }) => {
                                    const color = colorScale(ot);
                                    return (
                                        <g key={ot} transform={`translate(${x}, ${y})`}>
                                            <ellipse
                                                rx={NODE_RX}
                                                ry={NODE_RY}
                                                fill="white"
                                                stroke={color}
                                                strokeWidth={2}
                                            />
                                            <text
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fontSize={10}
                                                fontFamily="sans-serif"
                                                fill={color}
                                                fontWeight={600}
                                            >
                                                {ot.length > 14 ? `${ot.slice(0, 13)}…` : ot}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        )}
                    </div>

                    <div className="w-52 flex flex-col gap-4 overflow-y-auto shrink-0">
                        {objectTypes.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                    Object Types
                                </p>
                                <ul className="flex flex-col gap-1">
                                    {objectTypes.map((ot) => (
                                        <li key={ot} className="text-xs flex items-center gap-1.5">
                                            <span
                                                className="h-2 w-2 rounded-full shrink-0"
                                                style={{ backgroundColor: colorScale(ot) }}
                                            />
                                            {ot}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                Identity Relations
                            </p>
                            {identityRelations.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">None at this operator.</p>
                            ) : (
                                <ul className="flex flex-col gap-2">
                                    {identityRelations.map((rel, i) => (
                                        <li key={i} className="text-xs border rounded p-1.5 bg-muted/30">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono text-[10px] bg-indigo-100 text-indigo-700 rounded px-1 shrink-0">
                                                    {KIND_SYMBOLS[rel.kind]}
                                                </span>
                                                <span className="text-muted-foreground">{KIND_LABELS[rel.kind]}</span>
                                            </div>
                                            <div className="mt-1 text-[11px]">
                                                <span className="font-medium">{rel.left.join(', ')}</span>
                                                <span className="text-muted-foreground mx-1">↔</span>
                                                <span className="font-medium">{rel.right.join(', ')}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default IdentityRelationViewer;
