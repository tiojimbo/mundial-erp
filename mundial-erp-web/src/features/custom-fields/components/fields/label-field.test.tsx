import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LabelField } from './label-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

describe('LabelField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza chips a partir de options[]', () => {
    const def = makeCustomFieldDefinition({
      type: 'LABEL',
      name: 'Tags',
      options: ['urgente', 'normal'],
    });
    render(<LabelField definition={def} value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'urgente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'normal' })).toBeInTheDocument();
  });

  it('toggle de chip emite valor via onChange', () => {
    const onChange = vi.fn();
    const def = makeCustomFieldDefinition({
      type: 'LABEL',
      options: ['urgente', 'normal'],
    });
    render(<LabelField definition={def} value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'urgente' }));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith('urgente');
  });
});
