/**
 * Stories — TextField (TTT-021).
 *
 * Variantes obrigatorias por AC: vazio, preenchido, erro. Adicional:
 * required + readOnly cobrem combinacoes do dispatcher.
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from "../../types/custom-field.fixtures";
import { TextField } from './text-field';

const baseDef: CustomFieldDefinition = makeCustomFieldDefinition({ id: 'def-text-1', workspaceId: null, name: 'Observacao', type: 'TEXT', config: { hint: 'Texto livre, max 2000 caracteres.' }, fixed: true, position: 10 });

const meta: Meta<typeof TextField> = {
  title: 'CustomFields/TextField',
  component: TextField,
  args: {
    onChange: () => undefined,
  },
};

export default meta;

type Story = StoryObj<typeof TextField>;

export const Empty: Story = {
  args: { definition: baseDef, value: null },
};

export const Filled: Story = {
  args: { definition: baseDef, value: 'Pedido urgente — cliente VIP.' },
};

export const WithError: Story = {
  args: {
    definition: { ...baseDef, required: true },
    value: '',
    error: 'Campo obrigatorio',
  },
};

export const ReadOnly: Story = {
  args: {
    definition: baseDef,
    value: 'Somente leitura',
    readOnly: true,
  },
};
