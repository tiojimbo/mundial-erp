/**
 * Sprint 2 (TTT-024) — Vitest DropdownField.
 * Owner: Tatiana Brandao.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DropdownField } from './dropdown-field';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

const definition: CustomFieldDefinition = makeCustomFieldDefinition({
  id: 'def-dropdown-1',
  workspaceId: 'ws-1',
  name: 'Status',
  type: 'DROPDOWN',
  config: {
    options: [
      { value: 'open', label: 'Aberto' },
      { value: 'closed', label: 'Fechado' },
    ],
  },
});

describe('DropdownField (TTT-024)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza combobox com placeholder quando sem valor', () => {
    const onChange = vi.fn();
    render(
      <DropdownField
        definition={definition}
        value={null}
        onChange={onChange}
      />,
    );
    const combobox = screen.getByRole('combobox', { name: /status/i });
    expect(combobox).toBeInTheDocument();
    expect(combobox).toHaveTextContent('Sem valor');
  });

  it('mostra label da opcao selecionada quando value bate', () => {
    const onChange = vi.fn();
    render(
      <DropdownField
        definition={definition}
        value='open'
        onChange={onChange}
      />,
    );
    const combobox = screen.getByRole('combobox', { name: /status/i });
    expect(combobox).toHaveTextContent('Aberto');
  });

  it('placeholder quando options vazio', () => {
    const onChange = vi.fn();
    const empty: CustomFieldDefinition = {
      ...definition,
      config: { options: [] },
    };
    render(
      <DropdownField definition={empty} value={null} onChange={onChange} />,
    );
    expect(
      screen.getByPlaceholderText(/sem opcoes configuradas/i),
    ).toBeDisabled();
  });

  it('aria-invalid=true e mensagem visivel em erro', () => {
    const onChange = vi.fn();
    render(
      <DropdownField
        definition={definition}
        value={null}
        onChange={onChange}
        error='Selecione uma opcao'
      />,
    );
    const select = screen.getByRole('combobox', { name: /status/i });
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione uma opcao');
  });
});
