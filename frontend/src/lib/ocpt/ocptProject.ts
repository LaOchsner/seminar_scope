import type { HierarchyPointNode } from '@visx/hierarchy/lib/types';
import {
    isActivity,
    isExtendedProcessTreeOperatorNode,
    isIdentityOperatorApi,
    isProcessTreeOperator,
    isSilentActivity,
    isTrueSilentActivity,
} from '~/lib/ocpt/ocptGuards';
import type { IdentityRelation } from '~/types/ocpt/identityOcpt.types';
import { type ExtendedOperatorType, type Node, type ObjectType } from '~/types/ocpt/ocpt.types';

export const projectTreeOntoOT = (root: HierarchyPointNode<Node>, targetObjectTypes: string[]): void => {
    if (!root.children || targetObjectTypes.length === 0) return;
    updateNode(root, targetObjectTypes);
    console.log(root);
};

const updateNode = (node: HierarchyPointNode<Node>, targetObjectTypes: string[]): HierarchyPointNode<Node> => {
    // Base Case: Leaf Node: Make SilentActivity iff targetObjectTypes not included and/or simply return the node.
    if (isActivity(node.data.value)) {
        // Leaf node does not contain the targetObjectTypes => Activity is SilentActivity
        const activityData = node.data.value;
        if (!activityData.ots.some((ot) => targetObjectTypes.includes(ot.ot))) {
            node.data.value = { activity: activityData.activity, ots: activityData.ots, isSilent: true };
        }

        return node;
    }
    // Otherwise node is Internal Node:
    const nodeChildren = (node.children || []).map((child) => updateNode(child, targetObjectTypes));
    node.children = nodeChildren;

    // Skip case
    if (isSkipSubtree(nodeChildren)) {
        const childrendIntersectOT = intersectMultipleObjectTypes(
            nodeChildren.map((child) => {
                const value = child.data.value;
                if (isTrueSilentActivity(value) || isExtendedProcessTreeOperatorNode(value)) return value.ots;
                return [];
            })
        );
        node.data.value = { operator: 'skip', ots: childrendIntersectOT };
    }
    // Arbitrary case
    else if (isArbitrarySubtree(nodeChildren, targetObjectTypes)) {
        const childrendIntersectOT = intersectMultipleObjectTypes(
            nodeChildren.map((child) => {
                const value = child.data.value;
                if (isTrueSilentActivity(value) || isExtendedProcessTreeOperatorNode(value)) return value.ots;
                return [];
            })
        );
        node.data.value = { operator: 'arbitrary', ots: childrendIntersectOT };
    }

    return node;
};

// Exclusive type of replacements for an OCPT Operator Node for the object type ot
// 1. "Arbitary" -> Objects of targetObjectTypes can take part or can not take part in the activities of the subtree
// (divergent in all subtrees so regular Activity with targetObjectTypes being div or SilenctActivity being div or ArbitraryOperator)
const isArbitrarySubtree = (nodeChildren: HierarchyPointNode<Node>[], targetObjectTypes: string[]) => {
    const childrenResults = nodeChildren.map((child) => {
        const value = child.data.value;
        // Either:
        // - Child is Arbitrary or Skip Operator
        // - Child is True SilentActivity
        // - Child is SilentActivity with targetObjectTypes diverging
        // - Child is Activity with targetObjectTypes diverging

        // Child is Arbitrary or Skip Operator
        if (isExtendedProcessTreeOperatorNode(value) && (value.operator === 'skip' || value.operator === 'arbitrary'))
            return true;
        else if (isTrueSilentActivity(value)) {
            return true;
        }
        // Check if targetObjectType diverging in Child
        else if (isSilentActivity(value) || isActivity(value)) {
            if (!value.ots.some((item) => targetObjectTypes.includes(item.ot))) return false;

            const results = value.ots.map((item) => {
                // If object does not have "exhibits" property return false
                if (targetObjectTypes.includes(item.ot) && !item.exhibits) return false;
                // Else if Item has targetObjectTypes then it is only true if targetObjectTypes are also diverging
                else if (targetObjectTypes.includes(item.ot) && item.exhibits) return item.exhibits.includes('div');
                // Otherwise just return true
                return true;
            });
            return results.every((result) => result === true);
        }
        // Some case that I did not think about and should not happen
        else {
            return false;
        }
    });
    return childrenResults.every((result) => result === true);
};

// 2. "Skip" -> Objects of targetObjectTypes completely skip the subtree (Leafs are SilentActivities)
const isSkipSubtree = (nodeChildren: HierarchyPointNode<Node>[]) => {
    const childrenResults = nodeChildren.map((child) => {
        const value = child.data.value;
        // Either:
        // - Child is SilentActivity and isSilent === true
        // - Child is Skip Operator
        return isTrueSilentActivity(value) || (isExtendedProcessTreeOperatorNode(value) && value.operator === 'skip');
    });
    return childrenResults.every((result) => result === true);
};

// Additional
// "Part of a Group" -> Objects of ot are converging in all leafs of the subtree

const intersectObjectTypes = (set1: ObjectType[], set2: ObjectType[]): ObjectType[] => {
    const result: ObjectType[] = [];

    // Create a map of the second set for easier lookup
    const set2Map = new Map<string, ObjectType>();
    set2.forEach((item) => set2Map.set(item.ot, item));

    // Check each item in set1
    set1.forEach((item1) => {
        const item2 = set2Map.get(item1.ot);

        // If item with same "ot" exists in set2
        if (item2) {
            const newObjectType: ObjectType = { ot: item1.ot, exhibits: [] };

            // Handle exhibits intersection if both have exhibits
            if (item1.exhibits && item2.exhibits) {
                const commonExhibits = item1.exhibits.filter((ex) => item2.exhibits!.includes(ex));
                if (commonExhibits.length > 0) {
                    newObjectType.exhibits = commonExhibits;
                }
            }

            result.push(newObjectType);
        }
    });

    return result;
};

const intersectMultipleObjectTypes = (sets: ObjectType[][]): ObjectType[] => {
    if (sets.length === 1) {
        return sets[0];
    }

    return sets.reduce((accumulator, currentSet) => {
        return intersectObjectTypes(accumulator, currentSet);
    });
};

/**
 * Goes through the OCPT received from the API with DFS and changes each node
 * that is a @type {OperatorType} or an @type {IdentityOperatorApi} into an @type {ExtendedOperator}.
 *
 * This way we can be sure that each OperatorNode has the "ots" property correctly populated
 * as this is required for the projections.
 *
 * In this step we already propagate the ots from the leaf nodes upwards and store them in the operator nodes.
 * This way the projection
 */
export const updateTreeWithExtendedOperators = (node: HierarchyPointNode<Node>): HierarchyPointNode<Node> => {
    // Base case: if node is a leaf, return it unchanged
    if (!node.children || node.children.length === 0) {
        return node;
    }

    // First, recursively update all children
    node.children = node.children.map((child) => updateTreeWithExtendedOperators(child));

    // Get the value of the current node
    const nodeValue = node.data.value;

    // Collect object types from all children (shared by both branches below)
    const collectChildrenOTs = () =>
        node.children!.map((child) => {
            const childValue = child.data.value;
            if (
                isActivity(childValue) ||
                isSilentActivity(childValue) ||
                isExtendedProcessTreeOperatorNode(childValue)
            ) {
                return childValue.ots;
            }
            return [];
        });

    // Check if this node has a process tree operator (plain string like "sequence")
    if (isProcessTreeOperator(nodeValue)) {
        const intersectedOTs = intersectMultipleObjectTypes(collectChildrenOTs());
        node.data.value = { operator: nodeValue, ots: intersectedOTs };
    }

    // Check if the node is an IdentityOperator received from the API that does not have an ots property yet
    else if (isIdentityOperatorApi(nodeValue)) {
        const intersectedOTs = intersectMultipleObjectTypes(collectChildrenOTs());
        node.data.value = {
            operator: nodeValue.operator as ExtendedOperatorType,
            ots: intersectedOTs,
            identity: nodeValue.identity as IdentityRelation[] | undefined,
        };
    }

    return node;
};
