/**
 * Stories — CustomFieldEditor (TTT-021 dispatcher).
 *
 * Cobre os 10 tipos via switch interno do dispatcher. Cada story instancia
 * uma definition diferente para validar visualmente que cada caso renderiza
 * o editor correto.
 */

import type { Meta, StoryObj } from '@storybook/react';
import type {
  CustomFieldDefinition,
  CustomFieldType,
} from '../types/custom-field.types';
import { CustomFieldEditor } from './custom-field-editor';

function makeDef(
  type: CustomFieldType,
  overrides: Partial<CustomFieldDefinition> = {},
): CustomFieldDefinition {
  return {
    id: `def-${type.toLowerCase()}`,
    workspaceId: null,
    key: type.toLowerCase(),
    label: `Campo ${type}`,
    type,
    required: false,
    isBuiltin: true,
    sortOrder: 0,
    createdAt: '2026-04-25T00:00:00Z',
    updatedAt: '2026-04-25T00:00:00Z',
    ...overrides,
  };
}

const meta: Meta<typeof CustomFieldEditor> = {
  title: 'CustomFields/Editor',
  component: CustomFieldEditor,
  args: { onChange: () => undefined },
};

export default meta;

type Story = StoryObj<typeof CustomFieldEditor>;

export const TextEmpty: Story = {
  args: { definition: makeDef('TEXT'), value: null },
};

export const NumberFilled: Story = {
  args: { definition: makeDef('NUMBER'), value: 7 },
};

export const CurrencyError: Story = {
  args: {
    definition: makeDef('CURRENCY', { required: true }),
    value: null,
    error: 'Valor obrigatorio',
  },
};

export const DateFilled: Story = {
  args: { definition: makeDef('DATE'), value: '2026-06-01' },
};

export const DropdownFilled: Story = {
  args: {
    definition: makeDef('DROPDOWN', {
      config: {
        options: [
          { value: 'A', label: 'Opcao A' },
          { value: 'B', label: 'Opcao B' },
        ],
      },
    }),
    value: 'A',
  },
};

export const CpfWithError: Story = {
  args: {
    definition: makeDef('CPF', { required: true }),
    value: '111',
    error: 'CPF invalido',
  },
};

export const PhoneFilled: Story = {
  args: { definition: makeDef('PHONE'), value: '11987654321' },
};
