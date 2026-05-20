/**
 * Stories — PhoneField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from "../../types/custom-field.fixtures";
import { PhoneField } from './phone-field';

const baseDef: CustomFieldDefinition = makeCustomFieldDefinition({ id: 'def-phone-1', workspaceId: null, name: 'Telefone do cliente', type: 'PHONE', fixed: true, position: 100 });

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
