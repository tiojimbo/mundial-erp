import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { RelationshipField } from './relationship-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

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
      { wrapper: Wrapper },
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'task-1, task-2' },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenLastCalledWith(['task-1', 'task-2']);
  });

  it('mostra hint padrao', () => {
    const def = makeCustomFieldDefinition({ type: 'RELATIONSHIP' });
    render(
      <RelationshipField definition={def} value={null} onChange={vi.fn()} />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText(/IDs de tasks/i)).toBeInTheDocument();
  });
});
