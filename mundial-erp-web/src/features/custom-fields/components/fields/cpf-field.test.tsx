/**
 * Sprint 2 (TTT-024) — Vitest CpfField.
 * Owner: Tatiana Brandao.
 *
 * Cobertura mascara: 11 digitos -> 999.999.999-99.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CpfField } from './cpf-field';
import type { CustomFieldDefinition } from '../../types/custom-field.types';

const definition: CustomFieldDefinition = {
  id: 'def-cpf-1',
  workspaceId: 'ws-1',
  key: 'cpf',
  label: 'CPF',
  type: 'CPF',
  required: false,
  config: null,
  isBuiltin: false,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('CpfField (TTT-024)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('aplica mascara 999.999.999-99', () => {
    const onChange = vi.fn();
    render(
      <CpfField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText(
      '000.000.000-00',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '12345678901' } });
    expect(input.value).toBe('123.456.789-01');
  });

  it('debouncea onChange com valor mascarado', () => {
    const onChange = vi.fn();
    render(
      <CpfField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText('000.000.000-00');
    fireEvent.change(input, { target: { value: '12345678901' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith('123.456.789-01');
  });

  it('valor existente reformatado ao montar', () => {
    const onChange = vi.fn();
    render(
      <CpfField
        definition={definition}
        value={'98765432100'}
        onChange={onChange}
      />,
    );
    const input = screen.getByPlaceholderText(
      '000.000.000-00',
    ) as HTMLInputElement;
    expect(input.value).toBe('987.654.321-00');
  });

  it('aria-invalid=true e mensagem visivel em erro', () => {
    const onChange = vi.fn();
    render(
      <CpfField
        definition={definition}
        value={null}
        onChange={onChange}
        error="CPF invalido"
      />,
    );
    const input = screen.getByPlaceholderText('000.000.000-00');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toHaveTextContent('CPF invalido');
  });
});
