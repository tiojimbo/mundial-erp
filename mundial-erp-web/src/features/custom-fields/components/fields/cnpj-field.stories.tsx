/**
 * Stories — CnpjField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';
import { CnpjField } from './cnpj-field';

const baseDef: CustomFieldDefinition = makeCustomFieldDefinition({
  id: 'def-cnpj-1',
  workspaceId: null,
  name: 'CNPJ do fornecedor',
  type: 'CNPJ',
  fixed: true,
  position: 70,
});

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
