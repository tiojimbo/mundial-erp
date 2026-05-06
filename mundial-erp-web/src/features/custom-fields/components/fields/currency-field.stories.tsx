/**
 * Stories — CurrencyField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { CurrencyField } from './currency-field';

const baseDef: CustomFieldDefinition = {
  id: 'def-cur-1',
  workspaceId: null,
  key: 'valor_total',
  label: 'Valor total',
  type: 'CURRENCY',
  required: false,
  config: { hint: 'Em reais (R$).' },
  isBuiltin: true,
  sortOrder: 30,
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z',
};

const meta: Meta<typeof CurrencyField> = {
  title: 'CustomFields/CurrencyField',
  component: CurrencyField,
  args: { onChange: () => undefined },
};

export default meta;

type Story = StoryObj<typeof CurrencyField>;

export const Empty: Story = {
  args: { definition: baseDef, value: null },
};

export const Filled: Story = {
  args: { definition: baseDef, value: 1234.56 },
};

export const WithError: Story = {
  args: {
    definition: { ...baseDef, required: true },
    value: null,
    error: 'Informe um valor valido',
  },
};
