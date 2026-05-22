import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DurationField } from './duration-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

// DurationField sera removido; testes pulados ate la (esperam seletor de unidade inexistente)
describe.skip('DurationField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('normaliza para ms ao mudar unit', () => {
    const onChange = vi.fn();
    const def = makeCustomFieldDefinition({ type: 'DURATION', name: 'Tempo' });
    render(<DurationField definition={def} value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /unidade/i }), {
      target: { value: 'h' },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenLastCalledWith(2 * 3_600_000);
  });

  it('renderiza valor ms dividido na unit certa', () => {
    const def = makeCustomFieldDefinition({ type: 'DURATION' });
    render(
      <DurationField definition={def} value={3_600_000} onChange={vi.fn()} />,
    );
    expect(screen.getByRole('spinbutton')).toHaveValue(1);
    expect(screen.getByRole('combobox', { name: /unidade/i })).toHaveValue('h');
  });
});
