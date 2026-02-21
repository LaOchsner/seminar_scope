import type {
    Activity,
    ExtendedOperator,
    IdentityRelation,
    Node,
    OperatorType,
    SilentActivity,
} from '~/types/ocpt/ocpt.types';

export type { IdentityRelation, IdentityRelationKind } from '~/types/ocpt/ocpt.types';

export interface IdentityOperatorApi {
    operator: OperatorType;
    identity?: IdentityRelation[]; // Even if there is no identity, it will still be value: { operator: X }
}

export interface IdentityOcptNodeWithoutId {
    value: Activity | SilentActivity | IdentityOperatorApi | ExtendedOperator;
    isExpanded?: boolean;
    children: IdentityOcptNode[];
}

export interface IdentityOcptNode extends IdentityOcptNodeWithoutId {
    id: number;
}

export interface IdentityOcptSchemaApi {
    ots: string[];
    hierarchy: IdentityOcptNodeWithoutId;
}

export interface IdentityOcptSchema {
    ots: string[];
    hierarchy: IdentityOcptNode;
}

export type AnyOcptNode = Node | IdentityOcptNode;
