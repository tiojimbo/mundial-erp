import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SelectField } from './select-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

describe('SelectField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza options da raiz (Hoppe-style)', () => {
    const def = makeCustomFieldDefinition({
      type: 'SELECT',
      name: 'Categoria',
      options: ['A', 'B', 'C'],
    });
    render(<SelectField definition={def} value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'B' })).toBeInTheDocument();
  });

  it('debouncea onChange ao selecionar', () => {
    const onChange = vi.fn();
    const def = makeCustomFieldDefinition({
      type: 'SELECT',
      name: 'Categoria',
      options: ['A', 'B'],
    });
    render(<SelectField definition={def} value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox', { name: /categoria/i }), {
      target: { value: 'A' },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith('A');
  });

  it('placeholder quando options vazio', () => {
    const def = makeCustomFieldDefinition({
      type: 'SELECT',
      name: 'Vazio',
      options: [],
    });
    render(<SelectField definition={def} value={null} onChange={vi.fn()} />);
    expect(
      screen.getByPlaceholderText(/sem opcoes configuradas/i),
    ).toBeDisabled();
  });
});
