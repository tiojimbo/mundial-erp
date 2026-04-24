/**
 * Storybook stories — PropertyRow (linha de propriedade no TaskView sidebar).
 *
 * Variantes: Status, Responsaveis, Datas (start/due), Prioridade, Tempo
 * estimado/logado, Tags. Cada variant tem estados editavel / readonly /
 * loading.
 */

import type { Meta, StoryObj } from '@storybook/react';

type PropertyKind =
  | 'status'
  | 'assignees'
  | 'dates'
  | 'priority'
  | 'time'
  | 'tags';

interface PropertyRowProps {
  kind: PropertyKind;
  label: string;
  value: React.ReactNode;
  editable?: boolean;
  loading?: boolean;
}

const PropertyRow = (props: PropertyRowProps): JSX.Element => (
  <div data-kind={props.kind} data-editable={props.editable}>
    <span>{props.label}</span>
    <span>{props.loading ? '...' : props.value}</span>
  </div>
);

const meta: Meta<typeof PropertyRow> = {
  title: 'Tasks/TaskView/PropertyRow',
  component: PropertyRow,
};

export default meta;

type Story = StoryObj<typeof PropertyRow>;

export const Status: Story = {
  args: { kind: 'status', label: 'Status', value: 'Em andamento' },
};

export const Assignees: Story = {
  args: { kind: 'assignees', label: 'Responsaveis', value: 'Ana, Joao, Maria' },
};

export const Dates: Story = {
  args: { kind: 'dates', label: 'Prazo', value: '15 abr - 20 abr' },
};

export const Priority: Story = {
  args: { kind: 'priority', label: 'Prioridade', value: 'Alta' },
};

export const Time: Story = {
  args: { kind: 'time', label: 'Tempo', value: '2h / 8h' },
};

export const Tags: Story = {
  args: { kind: 'tags', label: 'Tags', value: 'frontend, bug' },
};

export const Readonly: Story = {
  args: {
    kind: 'status',
    label: 'Status',
    value: 'Concluida',
    editable: false,
  },
};

export const Loading: Story = {
  args: { kind: 'status', label: 'Status', value: null, loading: true },
};
