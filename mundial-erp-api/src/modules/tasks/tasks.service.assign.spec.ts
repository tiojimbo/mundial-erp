/**
 * Unit tests — TasksService.assign (HPP-056).
 *
 * Cenarios cobertos pelo plano (linha 209: "testes cobrem casos: substituir,
 * vazio, trocar"):
 *   1. Substituir lista completa: current=[A], target=[B,C] -> add=[B,C], rem=[A]
 *   2. Vazio recoloca creator: current=[A], target=[] -> add=[creator], rem=[A]
 *   3. Trocar parcialmente: current=[A,B], target=[A,C] -> add=[C], rem=[B]
 *   4. Idempotencia: current=[A], target=[A] -> nenhum sync chamado
 *   5. Task nao encontrada (cross-tenant) -> NotFoundException
 */

import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import type { AssignTaskDto } from './dtos/assign-task.dto';

const WS = 'ws-1';
const TASK = 'task-1';
const ACTOR = 'user-actor';
const CREATOR = 'user-creator';

interface Harness {
  service: TasksService;
  prisma: { $transaction: jest.Mock };
  repository: {
    findAssignContext: jest.Mock;
    findAssigneeIds: jest.Mock;
    findExistenceRow: jest.Mock;
    findAssignees: jest.Mock;
  };
  assignees: { syncAssignees: jest.Mock };
}

function buildHarness(opts?: {
  assignContext?: { id: string; creatorId: string } | null;
  currentIds?: string[];
}): Harness {
  const repository = {
    findAssignContext: jest.fn(async () =>
      opts?.assignContext === undefined
        ? { id: TASK, creatorId: CREATOR }
        : opts.assignContext,
    ),
    findAssigneeIds: jest.fn(async () => opts?.currentIds ?? []),
    findExistenceRow: jest.fn(async () => ({
      id: TASK,
      archived: false,
      deletedAt: null,
      listId: 'list-1',
      statusId: 'status-1',
      mergedIntoId: null,
    })),
    findAssignees: jest.fn(async () => []),
  };

  const assignees = { syncAssignees: jest.fn(async () => undefined) };
  const prisma = {
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb({})),
  };

  const service = new TasksService(
    prisma as never,
    repository as never,
    {} as never,
    {} as never,
    assignees as never,
    {} as never,
    {} as never,
    {} as never,
  );

  return { service, prisma, repository, assignees };
}

function dto(userIds: string[]): AssignTaskDto {
  return { assignees: userIds.map((userId) => ({ userId })) };
}

describe('TasksService.assign (HPP-056)', () => {
  it('substituir: current=[A], target=[B,C] -> add=[B,C], rem=[A]', async () => {
    const h = buildHarness({ currentIds: ['A'] });

    await h.service.assign(WS, TASK, dto(['B', 'C']), ACTOR);

    expect(h.assignees.syncAssignees).toHaveBeenCalledTimes(1);
    const call = h.assignees.syncAssignees.mock.calls[0][1] as {
      add: string[];
      rem: string[];
    };
    expect(call.add.sort()).toEqual(['B', 'C']);
    expect(call.rem).toEqual(['A']);
  });

  it('vazio recoloca creator: current=[A], target=[] -> add=[creator], rem=[A]', async () => {
    const h = buildHarness({ currentIds: ['A'] });

    await h.service.assign(WS, TASK, dto([]), ACTOR);

    expect(h.assignees.syncAssignees).toHaveBeenCalledTimes(1);
    const call = h.assignees.syncAssignees.mock.calls[0][1] as {
      add: string[];
      rem: string[];
    };
    expect(call.add).toEqual([CREATOR]);
    expect(call.rem).toEqual(['A']);
  });

  it('trocar parcial: current=[A,B], target=[A,C] -> add=[C], rem=[B]', async () => {
    const h = buildHarness({ currentIds: ['A', 'B'] });

    await h.service.assign(WS, TASK, dto(['A', 'C']), ACTOR);

    expect(h.assignees.syncAssignees).toHaveBeenCalledTimes(1);
    const call = h.assignees.syncAssignees.mock.calls[0][1] as {
      add: string[];
      rem: string[];
    };
    expect(call.add).toEqual(['C']);
    expect(call.rem).toEqual(['B']);
  });

  it('idempotencia: current=[A], target=[A] -> sem sync', async () => {
    const h = buildHarness({ currentIds: ['A'] });

    await h.service.assign(WS, TASK, dto(['A']), ACTOR);

    expect(h.assignees.syncAssignees).not.toHaveBeenCalled();
  });

  it('task nao encontrada -> NotFoundException', async () => {
    const h = buildHarness({ assignContext: null });

    await expect(
      h.service.assign(WS, TASK, dto(['A']), ACTOR),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(h.prisma.$transaction).not.toHaveBeenCalled();
    expect(h.assignees.syncAssignees).not.toHaveBeenCalled();
  });

  it('read de assignees ocorre dentro da tx (gap 3 fix)', async () => {
    const h = buildHarness({ currentIds: ['A'] });

    await h.service.assign(WS, TASK, dto(['B']), ACTOR);

    // findAssigneeIds deve ter sido chamado COM tx (segundo argumento truthy).
    expect(h.repository.findAssigneeIds).toHaveBeenCalledTimes(1);
    const args = h.repository.findAssigneeIds.mock.calls[0];
    expect(args[0]).toBe(TASK);
    expect(args[1]).toBeTruthy(); // tx client
  });
});
