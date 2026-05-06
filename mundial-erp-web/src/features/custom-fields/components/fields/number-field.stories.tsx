/**
 * Stories — NumberField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { NumberField } from './number-field';

const baseDef: CustomFieldDefinition = {
  id: 'def-num-1',
  workspaceId: null,
  key: 'quantidade',
  label: 'Quantidade',
  type: 'NUMBER',
  required: false,
  config: { min: 0, max: 9999, hint: 'Use numeros inteiros.' },
  isBuiltin: true,
  sortOrder: 20,
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z',
};

const meta: Meta<typeof NumberField> = {
  title: 'CustomFields/NumberField',
  component: NumberField,
  args: { onChange: () => undefined },
};

export default meta;

type Story = StoryObj<typeof NumberField>;

export const Empty: Story = {
  args: { definition: baseDef, value: null },
};

export const Filled: Story = {
  args: { definition: baseDef, value: 42 },
};

export const WithError: Story = {
  args: {
    definition: { ...baseDef, required: true },
    value: null,
    error: 'Quantidade obrigatoria',
  },
};
