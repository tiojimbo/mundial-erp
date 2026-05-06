/**
 * Stories — CnpjField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { CnpjField } from './cnpj-field';

const baseDef: CustomFieldDefinition = {
  id: 'def-cnpj-1',
  workspaceId: null,
  key: 'cnpj_fornecedor',
  label: 'CNPJ do fornecedor',
  type: 'CNPJ',
  required: false,
  isBuiltin: true,
  sortOrder: 70,
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z',
};

const meta: Meta<typeof CnpjField> = {
  title: 'CustomFields/CnpjField',
  component: CnpjField,
  args: { onChange: () => undefined },
};

export default meta;

type Story = StoryObj<typeof CnpjField>;

export const Empty: Story = {
  args: { definition: baseDef, value: null },
};

export const Filled: Story = {
  args: { definition: baseDef, value: '12345678000199' },
};

export const WithError: Story = {
  args: {
    definition: { ...baseDef, required: true },
    value: '123',
    error: 'CNPJ invalido',
  },
};
