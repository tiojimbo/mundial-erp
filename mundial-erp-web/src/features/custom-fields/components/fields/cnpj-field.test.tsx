/**
 * Sprint 2 (TTT-024) — Vitest CnpjField.
 * Owner: Tatiana Brandao.
 *
 * Cobertura mascara: 14 digitos -> 99.999.999/9999-99.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CnpjField } from './cnpj-field';
import type { CustomFieldDefinition } from '../../types/custom-field.types';

const definition: CustomFieldDefinition = {
  id: 'def-cnpj-1',
  workspaceId: 'ws-1',
  key: 'cnpj',
  label: 'CNPJ',
  type: 'CNPJ',
  required: false,
  config: null,
  isBuiltin: false,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('CnpjField (TTT-024)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('aplica mascara 99.999.999/9999-99', () => {
    const onChange = vi.fn();
    render(
      <CnpjField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText(
      '00.000.000/0000-00',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '12345678000190' } });
    expect(input.value).toBe('12.345.678/0001-90');
  });

  it('debouncea onChange com valor mascarado', () => {
    const onChange = vi.fn();
    render(
      <CnpjField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText('00.000.000/0000-00');
    fireEvent.change(input, { target: { value: '12345678000190' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith('12.345.678/0001-90');
  });

  it('aria-invalid=true e mensagem visivel em erro', () => {
    const onChange = vi.fn();
    render(
      <CnpjField
        definition={definition}
        value={null}
        onChange={onChange}
        error="CNPJ invalido"
      />,
    );
    const input = screen.getByPlaceholderText('00.000.000/0000-00');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toHaveTextContent('CNPJ invalido');
  });

  it('input vazio -> null no onChange debounce', () => {
    const onChange = vi.fn();
    render(
      <CnpjField
        definition={definition}
        value={'12345678000190'}
        onChange={onChange}
      />,
    );
    const input = screen.getByPlaceholderText('00.000.000/0000-00');
    fireEvent.change(input, { target: { value: '' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
