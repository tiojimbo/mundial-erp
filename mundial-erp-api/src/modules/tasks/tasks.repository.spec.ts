import { TasksRepository } from './tasks.repository';

interface MockPrisma {
  list: { findUnique: jest.Mock };
  status: { findFirst: jest.Mock };
}

const FOUND_STATUS = { id: 'status-found-1' };

function buildRepository(listRow: Record<string, unknown> | null): {
  repository: TasksRepository;
  prisma: MockPrisma;
} {
  const prisma: MockPrisma = {
    list: { findUnique: jest.fn(async () => listRow) },
    status: { findFirst: jest.fn(async () => FOUND_STATUS) },
  };
  const repository = new TasksRepository(prisma as never);
  return { repository, prisma };
}

describe('TasksRepository.findFirstStatusForProcess', () => {
  it('CUSTOM: filtra status por listId', async () => {
    const { repository, prisma } = buildRepository({
      spaceId: 'space-1',
      folderId: 'folder-1',
      statusInheritance: 'CUSTOM',
      folder: { spaceId: 'space-1', statusInheritance: 'CUSTOM' },
    });

    const result = await repository.findFirstStatusForProcess('list-1');

    expect(result).toBe(FOUND_STATUS);
    const where = prisma.status.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({
      listId: 'list-1',
      type: 'NOT_STARTED',
      deletedAt: null,
    });
    expect(where.spaceId).toBeUndefined();
    expect(where.folderId).toBeUndefined();
  });

  it('SPACE: filtra por spaceId com folderId e listId null', async () => {
    const { repository, prisma } = buildRepository({
      spaceId: 'space-1',
      folderId: null,
      statusInheritance: 'SPACE',
      folder: null,
    });

    await repository.findFirstStatusForProcess('list-1');

    const where = prisma.status.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({
      spaceId: 'space-1',
      folderId: null,
      listId: null,
      type: 'NOT_STARTED',
      deletedAt: null,
    });
  });

  it('FOLDER com folder CUSTOM: filtra por folderId com listId null', async () => {
    const { repository, prisma } = buildRepository({
      spaceId: 'space-1',
      folderId: 'folder-1',
      statusInheritance: 'FOLDER',
      folder: { spaceId: 'space-1', statusInheritance: 'CUSTOM' },
    });

    await repository.findFirstStatusForProcess('list-1');

    const where = prisma.status.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({
      folderId: 'folder-1',
      listId: null,
      type: 'NOT_STARTED',
      deletedAt: null,
    });
    expect(where.spaceId).toBeUndefined();
  });

  it('FOLDER com folder SPACE: resolve para o spaceId do folder', async () => {
    const { repository, prisma } = buildRepository({
      spaceId: null,
      folderId: 'folder-1',
      statusInheritance: 'FOLDER',
      folder: { spaceId: 'space-do-folder', statusInheritance: 'SPACE' },
    });

    await repository.findFirstStatusForProcess('list-1');

    const where = prisma.status.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({
      spaceId: 'space-do-folder',
      folderId: null,
      listId: null,
    });
  });

  it('list inexistente: retorna null sem consultar status', async () => {
    const { repository, prisma } = buildRepository(null);

    const result = await repository.findFirstStatusForProcess('list-x');

    expect(result).toBeNull();
    expect(prisma.status.findFirst).not.toHaveBeenCalled();
  });
});
