/**
 * Sprint 2 (TTT-024) — Vitest NumberField.
 * Owner: Tatiana Brandao.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NumberField } from './number-field';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from "../../types/custom-field.fixtures";

const definition: CustomFieldDefinition = makeCustomFieldDefinition({ id: 'def-number-1', workspaceId: 'ws-1', name: 'Quantidade', type: 'NUMBER', config: { min: 0, max: 1000 } });

describe('NumberField (TTT-024)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza input numerico com min/max', () => {
    const onChange = vi.fn();
    render(
      <NumberField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText(
      'Quantidade',
    ) as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.min).toBe('0');
    expect(input.max).toBe('1000');
  });

  it('debouncea onChange em 500ms com numero parsado', () => {
    const onChange = vi.fn();
    render(
      <NumberField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText('Quantidade');
    fireEvent.change(input, { target: { value: '42' } });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it('string vazia -> null', () => {
    const onChange = vi.fn();
    render(
      <NumberField definition={definition} value={10} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText('Quantidade');
    fireEvent.change(input, { target: { value: '' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('aria-invalid=true e mensagem visivel em erro', () => {
    const onChange = vi.fn();
    render(
      <NumberField
        definition={definition}
        value={null}
        onChange={onChange}
        error="Numero invalido"
      />,
    );
    const input = screen.getByPlaceholderText('Quantidade');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toHaveTextContent('Numero invalido');
  });
});
