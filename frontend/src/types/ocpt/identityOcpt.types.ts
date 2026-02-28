import type { Node, NodeWithoutId } from '~/types/ocpt/ocpt.types';

export interface IdentityOcptSchemaApi {
    ots: string[];
    hierarchy: NodeWithoutId;
}

export interface IdentityOcptSchema {
    ots: string[];
    hierarchy: Node;
}
