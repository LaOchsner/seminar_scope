import type { Meta, StoryObj } from '@storybook/react';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import BaseFileNode from '~/components/explore/file/BaseFileNode';
import type { BaseExploreNodeDropdownOption, TFileNode } from '~/types/explore';

const nodeTypes = {
    baseFileNode: BaseFileNode,
};

const baseNodeProps: Omit<TFileNode, 'data'> = {
    id: '1',
    type: 'baseFileNode',
    position: { x: 0, y: 0 },
    selected: false,
    dragging: false,
    zIndex: 0,
    width: 200,
    height: 100,
};

const meta: Meta<typeof BaseFileNode> = {
    title: 'Explore/BaseFileNode',
    component: BaseFileNode,
    tags: ['autodocs'],
    decorators: [
        (Story, { args }) => (
            <div style={{ height: '300px', width: '100%' }}>
                <ReactFlow
                    nodeTypes={nodeTypes}
                    nodes={[
                        {
                            ...baseNodeProps,
                            data: args.data,
                        },
                    ]}
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const dropdownOptions: BaseExploreNodeDropdownOption[] = [
    { label: 'Open File Dialog', action: 'openFileDialog' },
    { label: 'Change Source File', action: 'changeSourceFile' },
];

const commonData = {
    nodeType: 'ocelFileNode' as const,
    nodeCategory: 'file' as const,
    display: {
        title: 'Base File Node',
        iconName: 'File',
    },
    config: {
        handleOptions: [],
        dropdownOptions: dropdownOptions,
        allowedAssetTypes: [],
    },
    onDataChange: () => {},
};

export const Default: Story = {
    args: {
        data: {
            ...commonData,
            assets: [],
        },
    },
};

export const WithAsset: Story = {
    args: {
        data: {
            ...commonData,
            assets: [
                {
                    id: 'asset-1',
                    name: 'example_file.csv',
                    type: 'ocelFile',
                    origin: 'preprocessed',
                    io: 'input',
                },
            ],
        },
    },
};
