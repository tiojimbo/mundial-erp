/**
 * Stories — DateField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from "../../types/custom-field.fixtures";
import { DateField } from './date-field';

const baseDef: CustomFieldDefinition = makeCustomFieldDefinition({ id: 'def-date-1', workspaceId: null, name: 'Data de entrega', type: 'DATE', fixed: true, position: 40 });

const meta: Meta<typeof DateField> = {
  title: 'CustomFields/DateField',
  component: DateField,
  args: { onChange: () => undefined },
};

export default meta;

type Story = StoryObj<typeof DateField>;

export const Empty: Story = {
  args: { definition: baseDef, value: null },
};

export const Filled: Story = {
  args: { definition: baseDef, value: '2026-05-10' },
};

export const WithError: Story = {
  args: {
    definition: { ...baseDef, required: true },
    value: null,
    error: 'Data obrigatoria',
  },
};
