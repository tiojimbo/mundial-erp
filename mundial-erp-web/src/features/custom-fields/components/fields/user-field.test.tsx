import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UserField } from './user-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

describe('UserField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('emite ID ao digitar', () => {
    const onChange = vi.fn();
    const def = makeCustomFieldDefinition({ type: 'USER', name: 'Responsavel' });
    render(<UserField definition={def} value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'user-abc123' },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith('user-abc123');
  });
});
