/**
 * Stories — UrlField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';
import { UrlField } from './url-field';

const baseDef: CustomFieldDefinition = makeCustomFieldDefinition({
  id: 'def-url-1',
  workspaceId: null,
  name: 'Link da proposta',
  type: 'URL',
  fixed: true,
  position: 80,
});

const meta: Meta<typeof UrlField> = {
  title: 'CustomFields/UrlField',
  component: UrlField,
  args: { onChange: () => undefined },
};

export default meta;

type Story = StoryObj<typeof UrlField>;

export const Empty: Story = {
  args: { definition: baseDef, value: null },
};

export const Filled: Story = {
  args: {
    definition: baseDef,
    value: 'https://mundial.example.com/proposta/123',
  },
};

export const WithError: Story = {
  args: {
    definition: { ...baseDef, required: true },
    value: 'nao-e-url',
    error: 'URL invalida',
  },
};
