/**
 * Stories — UrlField (TTT-021).
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { UrlField } from './url-field';

const baseDef: CustomFieldDefinition = {
  id: 'def-url-1',
  workspaceId: null,
  key: 'link_proposta',
  label: 'Link da proposta',
  type: 'URL',
  required: false,
  isBuiltin: true,
  sortOrder: 80,
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z',
};

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
  args: { definition: baseDef, value: 'https://mundial.example.com/proposta/123' },
};

export const WithError: Story = {
  args: {
    definition: { ...baseDef, required: true },
    value: 'nao-e-url',
    error: 'URL invalida',
  },
};
