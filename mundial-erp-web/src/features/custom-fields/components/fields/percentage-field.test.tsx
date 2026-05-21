import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PercentageField } from './percentage-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

describe('PercentageField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('emite number ao digitar', () => {
    const onChange = vi.fn();
    const def = makeCustomFieldDefinition({ type: 'PERCENTAGE', name: 'Desconto' });
    render(<PercentageField definition={def} value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '42' },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it('aceita decimal', () => {
    const onChange = vi.fn();
    const def = makeCustomFieldDefinition({ type: 'PERCENTAGE' });
    render(<PercentageField definition={def} value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '12.5' },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith(12.5);
  });
});
