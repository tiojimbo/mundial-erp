import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TeamField } from './team-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

describe('TeamField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('emite ID ao digitar', () => {
    const onChange = vi.fn();
    const def = makeCustomFieldDefinition({ type: 'TEAM', name: 'Squad' });
    render(<TeamField definition={def} value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'team-xyz789' },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith('team-xyz789');
  });
});
