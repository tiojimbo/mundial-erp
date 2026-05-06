/**
 * Sprint 2 (TTT-024) — Vitest DateField.
 * Owner: Tatiana Brandao.
 *
 * Cobertura: input type=date, ISO recortado quando vier `YYYY-MM-DDTHH:mm`,
 * onChange debounce, aria-invalid em erro.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DateField } from './date-field';
import type { CustomFieldDefinition } from '../../types/custom-field.types';

const definition: CustomFieldDefinition = {
  id: 'def-date-1',
  workspaceId: 'ws-1',
  key: 'due_date',
  label: 'Data de entrega',
  type: 'DATE',
  required: false,
  config: null,
  isBuiltin: false,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('DateField (TTT-024)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza input type=date com label', () => {
    const onChange = vi.fn();
    render(
      <DateField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByLabelText(/data de entrega/i) as HTMLInputElement;
    expect(input.type).toBe('date');
  });

  it('valor ISO completo e recortado para YYYY-MM-DD', () => {
    const onChange = vi.fn();
    render(
      <DateField
        definition={definition}
        value={'2026-04-25T14:30:00.000Z'}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText(/data de entrega/i) as HTMLInputElement;
    expect(input.value).toBe('2026-04-25');
  });

  it('debouncea onChange em 500ms', () => {
    const onChange = vi.fn();
    render(
      <DateField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByLabelText(/data de entrega/i);
    fireEvent.change(input, { target: { value: '2026-05-10' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith('2026-05-10');
  });

  it('aria-invalid=true e mensagem visivel em erro', () => {
    const onChange = vi.fn();
    render(
      <DateField
        definition={definition}
        value={null}
        onChange={onChange}
        error="Data invalida"
      />,
    );
    const input = screen.getByLabelText(/data de entrega/i);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toHaveTextContent('Data invalida');
  });
});
