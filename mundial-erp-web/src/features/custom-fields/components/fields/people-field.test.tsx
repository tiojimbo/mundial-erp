import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { PeopleField } from './people-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('PeopleField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('parseia ids separados por virgula e remove duplicatas', () => {
    const onChange = vi.fn();
    const def = makeCustomFieldDefinition({ type: 'PEOPLE', name: 'Time' });
    render(<PeopleField definition={def} value={null} onChange={onChange} />, {
      wrapper: Wrapper,
    });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'user-1, user-2 user-1' },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenLastCalledWith(['user-1', 'user-2']);
  });

  it('renderiza array existente', () => {
    const def = makeCustomFieldDefinition({ type: 'PEOPLE' });
    render(
      <PeopleField
        definition={def}
        value={['user-a', 'user-b']}
        onChange={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('textbox')).toHaveValue('user-a, user-b');
  });
});
