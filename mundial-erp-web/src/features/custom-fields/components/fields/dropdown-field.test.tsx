/**
 * Sprint 2 (TTT-024) — Vitest DropdownField.
 * Owner: Tatiana Brandao.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DropdownField } from './dropdown-field';
import type { CustomFieldDefinition } from '../../types/custom-field.types';

const definition: CustomFieldDefinition = {
  id: 'def-dropdown-1',
  workspaceId: 'ws-1',
  key: 'status',
  label: 'Status',
  type: 'DROPDOWN',
  required: false,
  config: {
    options: [
      { value: 'open', label: 'Aberto' },
      { value: 'closed', label: 'Fechado' },
    ],
  },
  isBuiltin: false,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('DropdownField (TTT-024)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza select com options do config', () => {
    const onChange = vi.fn();
    render(
      <DropdownField
        definition={definition}
        value={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Aberto' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Fechado' })).toBeInTheDocument();
  });

  it('debouncea onChange ao selecionar opcao', () => {
    const onChange = vi.fn();
    render(
      <DropdownField
        definition={definition}
        value={null}
        onChange={onChange}
      />,
    );
    const select = screen.getByRole('combobox', { name: /status/i });
    fireEvent.change(select, { target: { value: 'open' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith('open');
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
        error="Selecione uma opcao"
      />,
    );
    const select = screen.getByRole('combobox', { name: /status/i });
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione uma opcao');
  });
});
