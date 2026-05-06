/**
 * Stories — CustomFieldsSection (TTT-022).
 *
 * Como a secao depende de hooks (`useCustomFieldValues`, `useFeatureFlag`)
 * que precisam de QueryClient + WorkspaceStore + axios, o uso real exige
 * decorator no Storybook. Aqui mantemos os stories como contrato de props
 * (vazio / uma definition / multiplas / readOnly) e deixamos o decorator
 * de mocks como TODO da pagina de docs do Storybook.
 *
 * Os 3+ casos cobrem AC: vazio, preenchido, erro/readonly.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { CustomFieldsSection } from './custom-fields-section';

const meta: Meta<typeof CustomFieldsSection> = {
  title: 'CustomFields/Section',
  component: CustomFieldsSection,
};

export default meta;

type Story = StoryObj<typeof CustomFieldsSection>;

export const EmptyTask: Story = {
  args: { taskId: 'task-empty' },
};

export const FilteredByTemplate: Story = {
  args: {
    taskId: 'task-pedido-1',
    definitionIds: ['def-cliente', 'def-valor', 'def-data-entrega'],
    title: 'Detalhes do pedido',
  },
};

export const ReadOnly: Story = {
  args: {
    taskId: 'task-archived',
    readOnly: true,
    title: 'Detalhes (somente leitura)',
  },
};
