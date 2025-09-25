import type { Meta, StoryObj } from '@storybook/react';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import OcelFileNode from '~/components/explore/file/OcelFileNode';
import type { TFileNode } from '~/types/explore';

const nodeTypes = {
    ocelFileNode: OcelFileNode,
};

const initialNodes: TFileNode[] = [
    {
        id: '1',
        type: 'ocelFileNode',
        position: { x: 0, y: 0 },
        data: {
            nodeType: 'ocelFileNode',
            nodeCategory: 'file',
            display: {
                title: 'OCEL File',
                iconName: 'File',
            },
            config: {
                handleOptions: [],
                dropdownOptions: [],
                allowedAssetTypes: [],
            },
            assets: [],
            onDataChange: () => {},
        },
    },
];

const meta: Meta = {
    title: 'Explore/OcelFileNode',
    component: OcelFileNode,
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div style={{ height: '300px', width: '100%' }}>
                <ReactFlow nodeTypes={nodeTypes} nodes={initialNodes}>
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
