import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { UserField } from './user-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

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
    const def = makeCustomFieldDefinition({
      type: 'USER',
      name: 'Responsavel',
    });
    render(<UserField definition={def} value={null} onChange={onChange} />, {
      wrapper: Wrapper,
    });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'user-abc123' },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith('user-abc123');
  });
});
