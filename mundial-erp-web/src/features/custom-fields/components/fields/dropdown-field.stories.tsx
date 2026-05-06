/**
 * Stories — DropdownField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { DropdownField } from './dropdown-field';

const baseDef: CustomFieldDefinition = {
  id: 'def-drop-1',
  workspaceId: null,
  key: 'forma_pagamento',
  label: 'Forma de pagamento',
  type: 'DROPDOWN',
  required: false,
  config: {
    options: [
      { value: 'PIX', label: 'PIX' },
      { value: 'BOLETO', label: 'Boleto bancario' },
      { value: 'CARTAO', label: 'Cartao de credito' },
    ],
  },
  isBuiltin: true,
  sortOrder: 50,
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z',
};

const meta: Meta<typeof DropdownField> = {
  title: 'CustomFields/DropdownField',
  component: DropdownField,
  args: { onChange: () => undefined },
};

export default meta;

type Story = StoryObj<typeof DropdownField>;

export const Empty: Story = {
  args: { definition: baseDef, value: null },
};

export const Filled: Story = {
  args: { definition: baseDef, value: 'PIX' },
};

export const WithError: Story = {
  args: {
    definition: { ...baseDef, required: true },
    value: null,
    error: 'Selecione uma forma de pagamento',
  },
};

export const NoOptions: Story = {
  args: {
    definition: { ...baseDef, config: { options: [] } },
    value: null,
  },
};
