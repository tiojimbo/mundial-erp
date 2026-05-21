import { Logger } from '@nestjs/common';
import { TaskCommentsService } from './task-comments.service';

type AnyFn = jest.Mock;

interface MockPrisma {
  workItem: { findFirst: AnyFn };
  $transaction: AnyFn;
}
interface MockRepository {
  findTaskInWorkspace: AnyFn;
  assertParentBelongsToTask: AnyFn;
  assertUserInWorkspace: AnyFn;
  resolveUsernamesInWorkspace: AnyFn;
  create: AnyFn;
}
interface MockOutbox {
  enqueue: AnyFn;
}
interface MockPublisher {
  emitCommentCreated: AnyFn;
}

const WS = 'ws-1';
const TASK = 'task-1';
const ACTOR = 'user-actor';
const LIST = 'list-1';
const FOLDER = 'folder-1';
const SPACE = 'space-1';
const COMMENT_ID = 'comment-1';

function buildHarness() {
  const txOrder: string[] = [];

  const prisma: MockPrisma = {
    workItem: {
      findFirst: jest.fn(async () => ({
        listId: LIST,
        list: { folderId: FOLDER, spaceId: SPACE, folder: { spaceId: SPACE } },
      })),
    },
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => {
      txOrder.push('tx-begin');
      const out = await cb({});
      txOrder.push('tx-commit');
      return out;
    }),
  };

  const repository: MockRepository = {
    findTaskInWorkspace: jest.fn(async () => ({ id: TASK })),
    assertParentBelongsToTask: jest.fn(async () => null),
    assertUserInWorkspace: jest.fn(async () => null),
    resolveUsernamesInWorkspace: jest.fn(async () => []),
    create: jest.fn(async () => ({
      id: COMMENT_ID,
      workItemId: TASK,
      authorId: ACTOR,
      content: 'oi',
      contentBlocks: null,
      parentId: null,
      mentions: [],
      assigneeId: null,
      assignedById: null,
      editedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      author: { id: ACTOR, name: 'Actor', email: 'a@x' },
      assignee: null,
      reactions: [],
    })),
  };

  const outbox: MockOutbox = {
    enqueue: jest.fn(async () => {
      txOrder.push('outbox-enqueue');
      return undefined;
    }),
  };

  const publisher: MockPublisher = {
    emitCommentCreated: jest.fn(() => {
      txOrder.push('publisher-emit');
    }),
  };

  const service = new TaskCommentsService(
    prisma as never,
    repository as never,
    outbox as never,
    publisher as never,
  );

  Logger.overrideLogger([
    { log: () => undefined, warn: () => undefined, error: () => undefined } as never,
  ]);

  return { service, prisma, repository, outbox, publisher, txOrder };
}

describe('TaskCommentsService.create — emissao de evento para Automations', () => {
  it('emite emitCommentCreated uma vez com payload completo', async () => {
    const h = buildHarness();

    await h.service.create(
      WS,
      { taskId: TASK, content: 'mensagem teste' },
      ACTOR,
    );

    expect(h.publisher.emitCommentCreated).toHaveBeenCalledTimes(1);
    expect(h.publisher.emitCommentCreated).toHaveBeenCalledWith({
      workspaceId: WS,
      taskId: TASK,
      listId: LIST,
      folderId: FOLDER,
      spaceId: SPACE,
      actorUserId: ACTOR,
      commentId: COMMENT_ID,
      authorId: ACTOR,
    });
  });

  it('emite APOS commit da transacao (publisher chamado depois de tx-commit)', async () => {
    const h = buildHarness();

    await h.service.create(
      WS,
      { taskId: TASK, content: 'mensagem teste' },
      ACTOR,
    );

    expect(h.txOrder).toEqual([
      'tx-begin',
      'outbox-enqueue',
      'tx-commit',
      'publisher-emit',
    ]);
  });
});
