import type { HierarchyPointNode } from '@visx/hierarchy/lib/types';
import type { IdentityOperatorApi } from '~/types/ocpt/identityOcpt.types';
import {
    type Activity,
    type ExtendedOperator,
    type Node,
    type OperatorType,
    type SilentActivity,
} from '~/types/ocpt/ocpt.types';

export function isProcessTreeOperator(value: unknown): value is OperatorType {
    return value === 'xor' || value === 'parallel' || value === 'sequence' || value === 'loop';
}

export function isActivity(value: unknown): value is Activity {
    return value != null && typeof value === 'object' && 'activity' in value && 'ots' in value;
}

export function isSilentActivity(value: unknown): value is SilentActivity {
    return isActivity(value) && 'isSilent' in value;
}

export function isTrueSilentActivity(value: unknown): value is SilentActivity {
    return isSilentActivity(value) && value.isSilent === true;
}

export function isExtendedProcessTreeOperatorNode(value: unknown): value is ExtendedOperator {
    return (
        value != null && typeof value === 'object' && 'operator' in value && 'ots' in value && Array.isArray(value.ots)
    );
}

export function isIdentityOperatorApi(value: unknown): value is IdentityOperatorApi {
    return (
        value != null && typeof value === 'object' && 'operator' in value && !('ots' in value) && !('activity' in value)
    );
}

export function isActivityLeafNode(
    node: HierarchyPointNode<Node>
): node is HierarchyPointNode<Node> & { data: { value: Activity }; children: undefined | [] } {
    return isActivity(node.data.value) && !node.children;
}

export function categorizeNode(node: HierarchyPointNode<Node>): 'leaf' | 'internal' {
    if (isActivity(node.data.value) && !node.children) {
        return 'leaf';
    } else {
        return 'internal';
    }
}

export function isSilentActivityLeafNode(
    node: HierarchyPointNode<Node>
): node is HierarchyPointNode<Node> & { data: { value: SilentActivity }; children: undefined | [] } {
    return isSilentActivity(node.data.value) && !node.children;
}
