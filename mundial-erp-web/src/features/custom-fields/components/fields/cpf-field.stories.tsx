/**
 * Stories — CpfField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from "../../types/custom-field.fixtures";
import { CpfField } from './cpf-field';

const baseDef: CustomFieldDefinition = makeCustomFieldDefinition({ id: 'def-cpf-1', workspaceId: null, name: 'CPF do responsavel', type: 'CPF', fixed: true, position: 60 });

const meta: Meta<typeof CpfField> = {
  title: 'CustomFields/CpfField',
  component: CpfField,
  args: { onChange: () => undefined },
};

export default meta;

type Story = StoryObj<typeof CpfField>;

export const Empty: Story = {
  args: { definition: baseDef, value: null },
};

export const Filled: Story = {
  args: { definition: baseDef, value: '12345678909' },
};

export const WithError: Story = {
  args: {
    definition: { ...baseDef, required: true },
    value: '12345',
    error: 'CPF invalido',
  },
};
