/**
 * Storybook stories — StatusBadge (placeholder, imports reais chegam com Renato).
 *
 * Status: arquivo pronto para ser "importado" quando Storybook estiver
 * configurado (story story-INFRA-02 de Renato). Ate la, stories nao rodam
 * — mas servem de documentacao visual das variantes esperadas.
 *
 * Variantes cobertas:
 *   - 5 status categories: NOT_STARTED, ACTIVE, ON_HOLD, DONE, CANCELLED.
 *   - Estado checked/unchecked (para checklists internos).
 *   - Tamanho sm / md / lg.
 *
 * Deps: @storybook/react, @storybook/react-vite ou @storybook/nextjs.
 */

import type { Meta, StoryObj } from '@storybook/react';

// NOTE: componente real ainda nao existe. Stub placeholder ate Renato entregar.
type StatusCategory =
  | 'NOT_STARTED'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'DONE'
  | 'CANCELLED';

interface StatusBadgeProps {
  category: StatusCategory;
  label: string;
  checked?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge = (props: StatusBadgeProps): JSX.Element => (
  <span
    data-category={props.category}
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
  args: { category: 'NOT_STARTED', label: 'A fazer' },
};

export const Active: Story = {
  args: { category: 'ACTIVE', label: 'Em andamento' },
};

export const OnHold: Story = {
  args: { category: 'ON_HOLD', label: 'Pausada' },
};

export const Done: Story = {
  args: { category: 'DONE', label: 'Concluida' },
};

export const Cancelled: Story = {
  args: { category: 'CANCELLED', label: 'Cancelada' },
};

export const CheckedDone: Story = {
  args: { category: 'DONE', label: 'Concluida', checked: true },
};

export const UncheckedActive: Story = {
  args: { category: 'ACTIVE', label: 'Em andamento', checked: false },
};
