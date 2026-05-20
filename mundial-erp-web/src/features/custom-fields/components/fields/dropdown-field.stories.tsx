/**
 * Stories — DropdownField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from "../../types/custom-field.fixtures";
import { DropdownField } from './dropdown-field';

const baseDef: CustomFieldDefinition = makeCustomFieldDefinition({ id: 'def-drop-1', workspaceId: null, name: 'Forma de pagamento', type: 'DROPDOWN', config: {
    options: [
      { value: 'PIX', label: 'PIX' },
      { value: 'BOLETO', label: 'Boleto bancario' },
      { value: 'CARTAO', label: 'Cartao de credito' },
    ],
  }, fixed: true, position: 50 });

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
