import { Activity, ExtendedOperator, SilentActivity } from './ocpt.types';

// ── Identity relations ──────────────────────────────────────────────

export type IdentityRelationKind = 'sync' | 'impConcurrent';

export interface IdentityRelation {
    left: string[];
    right: string[];
    kind: IdentityRelationKind;
}

// ── Operator with identity ──────────────────────────────────────────

export interface OperatorWithIdentity {
    operator: ExtendedOperator;
    identity?: IdentityRelation[];
}

// ── Tree nodes ──────────────────────────────────────────────────────

export type NodeValue = Activity | SilentActivity | OperatorWithIdentity;

export interface Node {
    id: number;
    value: NodeValue;
    isExpanded?: boolean;
    children?: Node[];
}

// ── Type guards ─────────────────────────────────────────────────────

export function isOperatorWithIdentity(value: NodeValue): value is OperatorWithIdentity {
    return typeof value === 'object' && 'operator' in value && !('activity' in value);
}

export function hasIdentityRelations(value: NodeValue): boolean {
    return isOperatorWithIdentity(value) && Array.isArray(value.identity) && value.identity.length > 0;
}
