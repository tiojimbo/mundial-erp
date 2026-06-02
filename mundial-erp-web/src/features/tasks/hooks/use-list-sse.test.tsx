import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';

vi.mock('@/stores/workspace.store', () => ({
  useWorkspaceStore: (
    selector: (state: { currentWorkspace: { id: string } }) => unknown,
  ) => selector({ currentWorkspace: { id: 'ws-test' } }),
}));

import { useListSse } from './use-list-sse';
import { TASKS_GROUPED_KEY } from './use-tasks-grouped';

type Listener = (event: { data: string; lastEventId: string }) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;

  closed = false;

  onopen: (() => void) | null = null;

  onerror: (() => void) | null = null;

  private listeners = new Map<string, Listener>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: Listener) {
    this.listeners.set(type, handler);
  }

  emit(type: string, data: unknown, lastEventId = 'evt-1') {
    this.listeners.get(type)?.({ data: JSON.stringify(data), lastEventId });
  }

  close() {
    this.closed = true;
  }
}

function buildWrapper() {
  const qc = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

describe('useListSse', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
    localStorage.setItem('access_token', 'tok-1');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('conecta na rota de list e invalida TASKS_GROUPED_KEY no status.changed', () => {
    const { qc, wrapper } = buildWrapper();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    renderHook(() => useListSse('list-42'), { wrapper });

    const source = MockEventSource.instances[0];
    expect(source).toBeDefined();
    expect(source.url).toContain('/tasks/lists/list-42/events');
    expect(source.url).toContain('token=tok-1');

    act(() => {
      source.emit('status.changed', {
        taskId: 't1',
        listId: 'list-42',
        from: 's1',
        to: 's2',
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [...TASKS_GROUPED_KEY, 'list', 'list-42'],
    });
  });

  it('nao conecta quando enabled=false', () => {
    const { wrapper } = buildWrapper();
    renderHook(() => useListSse('list-42', { enabled: false }), {
      wrapper,
    });
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('fecha o EventSource no unmount (teardown)', () => {
    const { wrapper } = buildWrapper();
    const { unmount } = renderHook(() => useListSse('list-42'), {
      wrapper,
    });
    const source = MockEventSource.instances[0];
    unmount();
    expect(source.closed).toBe(true);
  });
});
