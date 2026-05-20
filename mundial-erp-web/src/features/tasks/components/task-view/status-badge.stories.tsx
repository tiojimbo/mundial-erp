import type { Meta, StoryObj } from '@storybook/react';

type StatusType = 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';

interface StatusBadgeProps {
  type: StatusType;
  label: string;
  checked?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge = (props: StatusBadgeProps): JSX.Element => (
  <span
    data-type={props.type}
    data-checked={props.checked}
    data-size={props.size ?? 'md'}
    style={{
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 12,
    }}
  >
    {props.label}
  </span>
);

const meta: Meta<typeof StatusBadge> = {
  title: 'Tasks/TaskView/StatusBadge',
  component: StatusBadge,
};

export default meta;

type Story = StoryObj<typeof StatusBadge>;

export const NotStarted: Story = {
  args: { type: 'NOT_STARTED', label: 'A fazer' },
};

export const Active: Story = {
  args: { type: 'ACTIVE', label: 'Em andamento' },
};

export const Done: Story = {
  args: { type: 'DONE', label: 'Concluida' },
};

export const Closed: Story = {
  args: { type: 'CLOSED', label: 'Fechada' },
};

export const CheckedDone: Story = {
  args: { type: 'DONE', label: 'Concluida', checked: true },
};

export const UncheckedActive: Story = {
  args: { type: 'ACTIVE', label: 'Em andamento', checked: false },
};
