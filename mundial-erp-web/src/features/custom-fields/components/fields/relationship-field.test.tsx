import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RelationshipField } from './relationship-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

describe('RelationshipField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('parseia taskIds e emite array', () => {
    const onChange = vi.fn();
    const def = makeCustomFieldDefinition({
      type: 'RELATIONSHIP',
      config: { taskTypeId: 'tt-1' },
    });
    render(
      <RelationshipField definition={def} value={null} onChange={onChange} />,
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'task-1, task-2' },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenLastCalledWith(['task-1', 'task-2']);
  });

  it('mostra hint com taskTypeId', () => {
    const def = makeCustomFieldDefinition({
      type: 'RELATIONSHIP',
      config: { taskTypeId: 'tt-99' },
    });
    render(
      <RelationshipField definition={def} value={null} onChange={vi.fn()} />,
    );
    expect(screen.getByText(/tt-99/)).toBeInTheDocument();
  });
});
