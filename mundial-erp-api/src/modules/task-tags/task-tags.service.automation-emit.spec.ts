import { Logger } from '@nestjs/common';
import { TaskTagsService } from './task-tags.service';

type AnyFn = jest.Mock;

interface MockPrisma {
  workItem: { findFirst: AnyFn };
  $transaction: AnyFn;
}
interface MockRepository {
  findTaskInWorkspace: AnyFn;
  findById: AnyFn;
  findLink: AnyFn;
  attach: AnyFn;
  detach: AnyFn;
}
interface MockOutbox {
  enqueue: AnyFn;
}
interface MockPublisher {
  emitTagAdded: AnyFn;
  emitTagRemoved: AnyFn;
}

const WS = 'ws-1';
const TASK = 'task-1';
const TAG = 'tag-1';
const ACTOR = 'user-actor';
const LIST = 'list-1';
const FOLDER = 'folder-1';
const SPACE = 'space-1';

function buildHarness(opts?: { linkExists?: boolean }) {
  const prisma: MockPrisma = {
    workItem: {
      findFirst: jest.fn(async () => ({
        listId: LIST,
        list: { folderId: FOLDER, spaceId: SPACE, folder: { spaceId: SPACE } },
      })),
    },
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb({})),
  };

  const repository: MockRepository = {
    findTaskInWorkspace: jest.fn(async () => ({ id: TASK })),
    findById: jest.fn(async () => ({ id: TAG, name: 'urgente' })),
    findLink: jest.fn(async () => (opts?.linkExists ? { id: 'link-1' } : null)),
    attach: jest.fn(async () => undefined),
    detach: jest.fn(async () => undefined),
  };

  const outbox: MockOutbox = { enqueue: jest.fn(async () => undefined) };

  const publisher: MockPublisher = {
    emitTagAdded: jest.fn(),
    emitTagRemoved: jest.fn(),
  };

  const service = new TaskTagsService(
    prisma as never,
    repository as never,
    outbox as never,
    publisher as never,
  );

  Logger.overrideLogger([
    {
      log: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    } as never,
  ]);

  return { service, prisma, repository, outbox, publisher };
}

describe('TaskTagsService — emissao de eventos para Automations', () => {
  describe('attach', () => {
    it('emite emitTagAdded uma vez com payload completo', async () => {
      const h = buildHarness();

      await h.service.attach(WS, TASK, TAG, ACTOR);

      expect(h.publisher.emitTagAdded).toHaveBeenCalledTimes(1);
      expect(h.publisher.emitTagAdded).toHaveBeenCalledWith({
        workspaceId: WS,
        taskId: TASK,
        listId: LIST,
        folderId: FOLDER,
        spaceId: SPACE,
        actorUserId: ACTOR,
        tagId: TAG,
      });
      expect(h.publisher.emitTagRemoved).not.toHaveBeenCalled();
    });

    it('attach idempotente em link existente nao emite evento (sem mutacao)', async () => {
      const h = buildHarness({ linkExists: true });

      await h.service.attach(WS, TASK, TAG, ACTOR);

      expect(h.repository.attach).not.toHaveBeenCalled();
      expect(h.publisher.emitTagAdded).not.toHaveBeenCalled();
    });
  });

  describe('detach', () => {
    it('emite emitTagRemoved uma vez com payload completo', async () => {
      const h = buildHarness({ linkExists: true });

      await h.service.detach(WS, TASK, TAG, ACTOR);

      expect(h.publisher.emitTagRemoved).toHaveBeenCalledTimes(1);
      expect(h.publisher.emitTagRemoved).toHaveBeenCalledWith({
        workspaceId: WS,
        taskId: TASK,
        listId: LIST,
        folderId: FOLDER,
        spaceId: SPACE,
        actorUserId: ACTOR,
        tagId: TAG,
      });
      expect(h.publisher.emitTagAdded).not.toHaveBeenCalled();
    });

    it('detach sem link existente nao emite evento (no-op)', async () => {
      const h = buildHarness({ linkExists: false });

      await h.service.detach(WS, TASK, TAG, ACTOR);

      expect(h.repository.detach).not.toHaveBeenCalled();
      expect(h.publisher.emitTagRemoved).not.toHaveBeenCalled();
    });
  });
});
