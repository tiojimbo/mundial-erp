/**
 * Stories — CurrencyField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';
import { CurrencyField } from './currency-field';

const baseDef: CustomFieldDefinition = makeCustomFieldDefinition({
  id: 'def-cur-1',
  workspaceId: null,
  name: 'Valor total',
  type: 'CURRENCY',
  config: { hint: 'Em reais (R$).' },
  fixed: true,
  position: 30,
});

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
