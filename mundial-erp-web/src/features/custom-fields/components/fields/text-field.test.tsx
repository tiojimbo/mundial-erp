/**
 * Sprint 2 (TTT-024) — Vitest TextField.
 *
 * AC TTT-024:
 *   - Renderiza com definition tipica.
 *   - Simula user typing -> assert onChange chamado debounced (500ms).
 *   - Renderiza com erro -> aria-invalid="true" e mensagem visivel.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TextField } from './text-field';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

const definition: CustomFieldDefinition = makeCustomFieldDefinition({
  id: 'def-text-1',
  workspaceId: 'ws-1',
  name: 'Descricao',
  type: 'TEXT',
});

describe('TextField (TTT-024)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza input com label e placeholder do definition', () => {
    const onChange = vi.fn();
    render(
      <TextField definition={definition} value={null} onChange={onChange} />,
    );

    expect(screen.getByLabelText(/descricao/i)).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Descricao') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.value).toBe('');
  });

  it('debouncea onChange em 500ms', () => {
    const onChange = vi.fn();
    render(
      <TextField definition={definition} value={null} onChange={onChange} />,
    );

    const input = screen.getByPlaceholderText('Descricao');
    fireEvent.change(input, { target: { value: 'novo texto' } });

    // Antes dos 500ms — onChange nao chamado.
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('novo texto');
  });

  it('passa null para string vazia', () => {
    const onChange = vi.fn();
    render(
      <TextField
        definition={definition}
        value={'inicial'}
        onChange={onChange}
      />,
    );

    const input = screen.getByPlaceholderText('Descricao');
    fireEvent.change(input, { target: { value: '' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('aria-invalid=true e mensagem de erro visivel quando error setado', () => {
    const onChange = vi.fn();
    render(
      <TextField
        definition={definition}
        value={null}
        onChange={onChange}
        error='Campo obrigatorio'
      />,
    );

    const input = screen.getByPlaceholderText('Descricao');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatorio');
  });

  it('readonly herdado do config.readOnly', () => {
    const onChange = vi.fn();
    const readOnlyDef: CustomFieldDefinition = {
      ...definition,
      config: { readOnly: true },
    };
    render(
      <TextField definition={readOnlyDef} value={'fixo'} onChange={onChange} />,
    );

    const input = screen.getByPlaceholderText('Descricao') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });
});
