import { HierarchyPointLink } from '@visx/hierarchy/lib/types';

export type Exhibit = 'div' | 'con' | 'def';
export type OperatorType = 'sequence' | 'parallel' | 'loop' | 'xor';
export type ExtendedOperatorType = OperatorType | 'skip' | 'arbitrary';
export interface ObjectType {
    ot: string;
    exhibits?: Exhibit[];
}

export interface Activity {
    activity: string;
    ots: ObjectType[];
}

export interface SilentActivity extends Activity {
    isSilent: boolean;
}

export interface ExtendedOperator {
    operator: ExtendedOperatorType;
    ots: ObjectType[]; // This is not in the paper but it is important for the projections!
}

export interface NodeWithoutId {
    value: Activity | OperatorType | SilentActivity | ExtendedOperator;
    isExpanded?: boolean;
    children: Node[];
}

export interface Node extends NodeWithoutId {
    id: number;
}

export interface OcptSchemaApi {
    ots: string[];
    hierarchy: NodeWithoutId;
}

export interface OcptSchema {
    ots: string[];
    hierarchy: Node;
}

export interface HierarchyPointLinkObjectCentric<T> extends HierarchyPointLink<T> {
    ot?: ObjectType;
}
