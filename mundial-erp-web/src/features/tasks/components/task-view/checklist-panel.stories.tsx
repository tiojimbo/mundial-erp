/**
 * Storybook stories — ChecklistPanel.
 *
 * Variantes: empty, 3 items, drag-in-progress, nested (parent + children).
 */

import type { Meta, StoryObj } from '@storybook/react';

interface ChecklistItem {
  id: string;
  title: string;
  resolved: boolean;
  parentId: string | null;
}

interface ChecklistPanelProps {
  items: ChecklistItem[];
  draggingId?: string | null;
}

const ChecklistPanel = (props: ChecklistPanelProps): JSX.Element => (
  <ul data-dragging={props.draggingId ?? undefined}>
    {props.items.length === 0 ? (
      <li>Nenhum item</li>
    ) : (
      props.items.map((i) => (
        <li key={i.id} data-resolved={i.resolved} data-parent={i.parentId}>
          {i.title}
        </li>
      ))
    )}
  </ul>
);

const meta: Meta<typeof ChecklistPanel> = {
  title: 'Tasks/TaskView/ChecklistPanel',
  component: ChecklistPanel,
};

export default meta;

type Story = StoryObj<typeof ChecklistPanel>;

export const Empty: Story = {
  args: { items: [] },
};

export const ThreeItems: Story = {
  args: {
    items: [
      { id: '1', title: 'Desenhar mock', resolved: true, parentId: null },
      { id: '2', title: 'Implementar layout', resolved: false, parentId: null },
      { id: '3', title: 'Revisar a11y', resolved: false, parentId: null },
    ],
  },
};

export const Dragging: Story = {
  args: {
    items: [
      { id: '1', title: 'Item 1', resolved: false, parentId: null },
      { id: '2', title: 'Item 2 (arrastando)', resolved: false, parentId: null },
      { id: '3', title: 'Item 3', resolved: false, parentId: null },
    ],
    draggingId: '2',
  },
};

export const Nested: Story = {
  args: {
    items: [
      { id: '1', title: 'Parent', resolved: false, parentId: null },
      { id: '1a', title: 'Child 1', resolved: false, parentId: '1' },
      { id: '1b', title: 'Child 2', resolved: true, parentId: '1' },
    ],
  },
};
