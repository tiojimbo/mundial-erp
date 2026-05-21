/**
 * Sprint 2 (TTT-024) — Vitest hook usePatchCustomFieldValue.
 * Owner: Tatiana Brandao.
 *
 * INFRAESTRUTURA: Vitest + @testing-library/react (`renderHook`) + React Query.
 * Como o projeto web ainda nao tem runner cabeado, o arquivo permanece com
 * sufixo `.skip` ate o setup TTT-??? lander. Quando o vitest entrar, basta
 * remover `.skip` da extensao.
 *
 * Cobertura AC TTT-024:
 *   - Optimistic update: `qc.getQueryData` mostra valor novo antes do server.
 *   - Rollback em 422: snapshot anterior e restaurado + toast de erro.
 *   - Sucesso: lista substituida pelo DTO autoritativo do backend.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';

// Mock do service ANTES do import do hook — Vitest hoists `vi.mock`.
vi.mock('../services/custom-field-values.service', () => ({
  customFieldValuesService: {
    listForTask: vi.fn(),
    setValue: vi.fn(),
  },
}));

// Mock workspace store sempre devolve o mesmo workspaceId.
vi.mock('@/stores/workspace.store', () => ({
  useWorkspaceStore: (
    selector: (state: { currentWorkspace: { id: string } }) => unknown,
  ) => selector({ currentWorkspace: { id: 'ws-test' } }),
}));

// Mock toast para nao acionar Sonner no jsdom.
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import {
  usePatchCustomFieldValue,
  customFieldValuesQueryKeys,
} from './use-custom-field-values';
import { customFieldValuesService } from '../services/custom-field-values.service';
import type { CustomFieldValue } from '../types/custom-field.types';
import { makeCustomFieldDefinition } from '../types/custom-field.fixtures';

const TASK_ID = 'task-1';
const DEFINITION_ID = 'def-1';
const WS_ID = 'ws-test';

const definition = makeCustomFieldDefinition({
  id: DEFINITION_ID,
  workspaceId: WS_ID,
  name: 'Descricao',
  type: 'TEXT',
});

const initialValue: CustomFieldValue = {
  id: 'val-1',
  taskId: TASK_ID,
  customFieldId: DEFINITION_ID,
  customField: definition,
  value: 'antigo',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

interface WrapperHandles {
  client: QueryClient;
  wrapper: ({ children }: { children: ReactNode }) => JSX.Element;
}

const buildWrapper = (): WrapperHandles => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const queryKey = customFieldValuesQueryKeys.byTask(WS_ID, TASK_ID);
  client.setQueryData<CustomFieldValue[]>(queryKey, [initialValue]);

  const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
};

describe('usePatchCustomFieldValue (TTT-024)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('OPTIMISTIC: queryCache mostra valor novo antes do servidor responder', async () => {
    const setValueMock = vi
      .mocked(customFieldValuesService.setValue)
      .mockImplementation(
        () =>
          new Promise<CustomFieldValue>((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ...initialValue,
                  value: 'novo',
                  updatedAt: new Date().toISOString(),
                }),
              50,
            );
          }),
      );

    const { client, wrapper } = buildWrapper();
    const { result } = renderHook(() => usePatchCustomFieldValue(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        taskId: TASK_ID,
        customFieldId: DEFINITION_ID,
        value: 'novo',
      });
    });

    // Optimistic: cache atualizado pelo `onMutate` async — aguardamos o
    // microtask em fila terminar antes de inspecionar o snapshot.
    const queryKey = customFieldValuesQueryKeys.byTask(WS_ID, TASK_ID);
    await waitFor(() => {
      const snap = client.getQueryData<CustomFieldValue[]>(queryKey);
      expect(snap?.[0]?.value).toBe('novo');
    });

    await waitFor(() => expect(setValueMock).toHaveBeenCalledTimes(1));
  });

  it('ROLLBACK em 422: restaura snapshot anterior e nao altera cache', async () => {
    const error = new Error('422 Unprocessable Entity');
    vi.mocked(customFieldValuesService.setValue).mockRejectedValueOnce(error);

    const { client, wrapper } = buildWrapper();
    const { result } = renderHook(() => usePatchCustomFieldValue(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        taskId: TASK_ID,
        customFieldId: DEFINITION_ID,
        value: 'novo',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const queryKey = customFieldValuesQueryKeys.byTask(WS_ID, TASK_ID);
    const cache = client.getQueryData<CustomFieldValue[]>(queryKey);
    expect(cache?.[0]?.value).toBe('antigo');
  });

  it('SUCESSO: cache substituido pelo DTO do servidor (autoritativo)', async () => {
    const serverDto: CustomFieldValue = {
      ...initialValue,
      value: 'salvo',
      updatedAt: '2026-04-25T12:00:00.000Z',
    };
    vi.mocked(customFieldValuesService.setValue).mockResolvedValueOnce(
      serverDto,
    );

    const { client, wrapper } = buildWrapper();
    const { result } = renderHook(() => usePatchCustomFieldValue(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        taskId: TASK_ID,
        customFieldId: DEFINITION_ID,
        value: 'salvo',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queryKey = customFieldValuesQueryKeys.byTask(WS_ID, TASK_ID);
    const cache = client.getQueryData<CustomFieldValue[]>(queryKey);
    expect(cache?.[0]).toMatchObject({
      value: 'salvo',
      updatedAt: '2026-04-25T12:00:00.000Z',
    });
  });
});
