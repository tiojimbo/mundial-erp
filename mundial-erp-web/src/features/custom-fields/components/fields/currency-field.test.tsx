/**
 * Sprint 2 (TTT-024) — Vitest CurrencyField.
 * Owner: Tatiana Brandao.
 *
 * Cobertura: parse de "1.234,56" -> 1234.56, prefix R$ nao-interativo,
 * aria-invalid em erro.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CurrencyField } from './currency-field';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

const definition: CustomFieldDefinition = makeCustomFieldDefinition({
  id: 'def-currency-1',
  workspaceId: 'ws-1',
  name: 'Total',
  type: 'CURRENCY',
});

describe('CurrencyField (TTT-024)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza input com prefix R$ nao-interativo', () => {
    const onChange = vi.fn();
    render(
      <CurrencyField
        definition={definition}
        value={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByPlaceholderText('0,00')).toBeInTheDocument();
    expect(screen.getByText('R$')).toHaveAttribute('aria-hidden', 'true');
  });

  it('parse "1.234,56" -> 1234.56 apos debounce', () => {
    const onChange = vi.fn();
    render(
      <CurrencyField
        definition={definition}
        value={null}
        onChange={onChange}
      />,
    );
    const input = screen.getByPlaceholderText('0,00');
    fireEvent.change(input, { target: { value: '1.234,56' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith(1234.56);
  });

  it('string vazia -> null', () => {
    const onChange = vi.fn();
    render(
      <CurrencyField definition={definition} value={9.9} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText('0,00');
    fireEvent.change(input, { target: { value: '' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('aria-invalid=true e mensagem visivel em erro', () => {
    const onChange = vi.fn();
    render(
      <CurrencyField
        definition={definition}
        value={null}
        onChange={onChange}
        error='Valor invalido'
      />,
    );
    const input = screen.getByPlaceholderText('0,00');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toHaveTextContent('Valor invalido');
  });
});
