/**
 * Stories — EmailField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from "../../types/custom-field.fixtures";
import { EmailField } from './email-field';

const baseDef: CustomFieldDefinition = makeCustomFieldDefinition({ id: 'def-email-1', workspaceId: null, name: 'E-mail de contato', type: 'EMAIL', fixed: true, position: 90 });

const meta: Meta<typeof EmailField> = {
  title: 'CustomFields/EmailField',
  component: EmailField,
  args: { onChange: () => undefined },
};

export default meta;

type Story = StoryObj<typeof EmailField>;

export const Empty: Story = {
  args: { definition: baseDef, value: null },
};

export const Filled: Story = {
  args: { definition: baseDef, value: 'contato@mundial.com' },
};

export const WithError: Story = {
  args: {
    definition: { ...baseDef, required: true },
    value: 'sem-arroba',
    error: 'E-mail invalido',
  },
};
