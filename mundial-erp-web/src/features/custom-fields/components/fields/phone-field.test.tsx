/**
 * Sprint 2 (TTT-024) — Vitest PhoneField.
 * Owner: Tatiana Brandao.
 *
 * Cobertura mascara dinamica: fixo (10 digs) e celular (11 digs).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PhoneField } from './phone-field';
import type { CustomFieldDefinition } from '../../types/custom-field.types';

const definition: CustomFieldDefinition = {
  id: 'def-phone-1',
  workspaceId: 'ws-1',
  key: 'phone',
  label: 'Telefone',
  type: 'PHONE',
  required: false,
  config: null,
  isBuiltin: false,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('PhoneField (TTT-024)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('aplica mascara celular (11 digitos)', () => {
    const onChange = vi.fn();
    render(
      <PhoneField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText(
      '(11) 91234-5678',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '11912345678' } });
    expect(input.value).toBe('(11) 91234-5678');
  });

  it('aplica mascara fixo (10 digitos)', () => {
    const onChange = vi.fn();
    render(
      <PhoneField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText(
      '(11) 91234-5678',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1133334444' } });
    expect(input.value).toBe('(11) 3333-4444');
  });

  it('debouncea onChange com valor mascarado', () => {
    const onChange = vi.fn();
    render(
      <PhoneField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText('(11) 91234-5678');
    fireEvent.change(input, { target: { value: '11912345678' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith('(11) 91234-5678');
  });

  it('aria-invalid=true e mensagem visivel em erro', () => {
    const onChange = vi.fn();
    render(
      <PhoneField
        definition={definition}
        value={null}
        onChange={onChange}
        error="Telefone invalido"
      />,
    );
    const input = screen.getByPlaceholderText('(11) 91234-5678');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toHaveTextContent('Telefone invalido');
  });
});
