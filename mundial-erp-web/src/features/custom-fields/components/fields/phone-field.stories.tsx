/**
 * Stories — PhoneField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { PhoneField } from './phone-field';

const baseDef: CustomFieldDefinition = {
  id: 'def-phone-1',
  workspaceId: null,
  key: 'telefone_cliente',
  label: 'Telefone do cliente',
  type: 'PHONE',
  required: false,
  isBuiltin: true,
  sortOrder: 100,
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z',
};

const meta: Meta<typeof PhoneField> = {
  title: 'CustomFields/PhoneField',
  component: PhoneField,
  args: { onChange: () => undefined },
};

export default meta;

type Story = StoryObj<typeof PhoneField>;

export const Empty: Story = {
  args: { definition: baseDef, value: null },
};

export const Filled: Story = {
  args: { definition: baseDef, value: '11912345678' },
};

export const WithError: Story = {
  args: {
    definition: { ...baseDef, required: true },
    value: '12',
    error: 'Telefone invalido',
  },
};
