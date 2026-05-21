import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomTaskTypesService } from './custom-task-types.service';

type RepoMock = {
  findById: jest.Mock;
  findByIdIncludingDeleted: jest.Mock;
  findManyBySpace: jest.Mock;
  nameExists: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  softDeleteWithCascadeNull: jest.Mock;
  spaceBelongsToWorkspace: jest.Mock;
};

type RedisMock = {
  publish: jest.Mock;
  duplicate: jest.Mock;
  get: jest.Mock;
  set: jest.Mock;
};

const WS_ID = 'ws-1';
const OTHER_WS = 'ws-2';
const SPACE_ID = 'sp-1';
const OTHER_SPACE = 'sp-2';
const TYPE_ID = 'ct-1';
const USER_ID = 'user-1';

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TYPE_ID,
    workspaceId: WS_ID,
    spaceId: null,
    creatorId: null,
    name: 'Pedido',
    namePlural: 'Pedidos',
    description: null,
    icon: null,
    color: null,
    avatarUrl: null,
    isBuiltin: false,
    sortOrder: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    creator: null,
    ...overrides,
  };
}

function buildService() {
  const repository: RepoMock = {
    findById: jest.fn(),
    findByIdIncludingDeleted: jest.fn(),
    findManyBySpace: jest.fn(),
    nameExists: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDeleteWithCascadeNull: jest.fn(),
    spaceBelongsToWorkspace: jest.fn(),
  };
  const subscriber = {
    subscribe: jest.fn(),
    on: jest.fn(),
  };
  const redis: RedisMock = {
    publish: jest.fn().mockResolvedValue(1),
    duplicate: jest.fn().mockReturnValue(subscriber),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  };
  const service = new CustomTaskTypesService(
    repository as never,
    redis as never,
  );
  return { service, repository, redis };
}

describe('CustomTaskTypesService.update', () => {
  it('403 quando builtin (workspaceId=null)', async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(
      makeRow({ workspaceId: null, isBuiltin: true }),
    );

    await expect(
      service.update(WS_ID, TYPE_ID, { value: 'Novo' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('403 quando isBuiltin=true mesmo com workspaceId', async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(makeRow({ isBuiltin: true }));

    await expect(
      service.update(WS_ID, TYPE_ID, { value: 'Novo' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404 quando cross-tenant (row pertence a outro workspace)', async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(makeRow({ workspaceId: OTHER_WS }));

    await expect(
      service.update(WS_ID, TYPE_ID, { value: 'Novo' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('404 quando nao existe', async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(null);

    await expect(
      service.update(WS_ID, TYPE_ID, { value: 'Novo' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('404 quando expectedSpaceId diferente do spaceId da entidade', async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(makeRow({ spaceId: OTHER_SPACE }));

    await expect(
      service.update(
        WS_ID,
        TYPE_ID,
        { value: 'Novo' },
        { expectedSpaceId: SPACE_ID },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('409 quando nameExists pre-check pega conflito', async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(makeRow());
    repository.nameExists.mockResolvedValue(true);

    await expect(
      service.update(WS_ID, TYPE_ID, { value: 'Outro Nome' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('409 quando race condition gera P2002 no banco', async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(makeRow());
    repository.nameExists.mockResolvedValue(false);
    repository.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('race', {
        code: 'P2002',
        clientVersion: '5.0.0',
      }),
    );

    await expect(
      service.update(WS_ID, TYPE_ID, { value: 'Outro' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('sucesso invalida cache via redis.publish', async () => {
    const { service, repository, redis } = buildService();
    repository.findById.mockResolvedValue(makeRow());
    repository.nameExists.mockResolvedValue(false);
    repository.update.mockResolvedValue(makeRow({ name: 'Atualizado' }));

    await service.update(WS_ID, TYPE_ID, { value: 'Atualizado' });

    expect(redis.publish).toHaveBeenCalledWith(
      CustomTaskTypesService.INVALIDATION_CHANNEL,
      `ws:${WS_ID}`,
    );
  });

  it('skip nameExists check quando name nao muda (case-insensitive)', async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(makeRow({ name: 'Pedido' }));
    repository.update.mockResolvedValue(makeRow());

    await service.update(WS_ID, TYPE_ID, { value: 'pedido' });

    expect(repository.nameExists).not.toHaveBeenCalled();
  });
});

describe('CustomTaskTypesService.remove', () => {
  it('403 quando builtin', async () => {
    const { service, repository } = buildService();
    repository.findByIdIncludingDeleted.mockResolvedValue(
      makeRow({ workspaceId: null, isBuiltin: true }),
    );

    await expect(service.remove(WS_ID, TYPE_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('404 quando cross-tenant', async () => {
    const { service, repository } = buildService();
    repository.findByIdIncludingDeleted.mockResolvedValue(
      makeRow({ workspaceId: OTHER_WS }),
    );

    await expect(service.remove(WS_ID, TYPE_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404 quando nao existe', async () => {
    const { service, repository } = buildService();
    repository.findByIdIncludingDeleted.mockResolvedValue(null);

    await expect(service.remove(WS_ID, TYPE_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404 quando expectedSpaceId nao bate com spaceId da entidade', async () => {
    const { service, repository } = buildService();
    repository.findByIdIncludingDeleted.mockResolvedValue(
      makeRow({ spaceId: OTHER_SPACE }),
    );

    await expect(
      service.remove(WS_ID, TYPE_ID, { expectedSpaceId: SPACE_ID }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('idempotente: ja soft-deletado retorna sem erro e sem chamar softDeleteWithCascadeNull', async () => {
    const { service, repository } = buildService();
    repository.findByIdIncludingDeleted.mockResolvedValue(
      makeRow({ deletedAt: new Date('2026-01-02') }),
    );

    await expect(service.remove(WS_ID, TYPE_ID)).resolves.toBeUndefined();
    expect(repository.softDeleteWithCascadeNull).not.toHaveBeenCalled();
  });

  it('1:1 Hoppe: com work items vinculados, deleta e propaga null (cascade)', async () => {
    const { service, repository } = buildService();
    repository.findByIdIncludingDeleted.mockResolvedValue(makeRow());

    await expect(service.remove(WS_ID, TYPE_ID)).resolves.toBeUndefined();
    expect(repository.softDeleteWithCascadeNull).toHaveBeenCalledWith(TYPE_ID);
  });

  it('1:1 Hoppe: com spaces/folders/lists como default, deleta e zera os defaults', async () => {
    const { service, repository } = buildService();
    repository.findByIdIncludingDeleted.mockResolvedValue(makeRow());

    await expect(service.remove(WS_ID, TYPE_ID)).resolves.toBeUndefined();
    expect(repository.softDeleteWithCascadeNull).toHaveBeenCalledWith(TYPE_ID);
  });

  it('sucesso: softDeleteWithCascadeNull + invalida cache', async () => {
    const { service, repository, redis } = buildService();
    repository.findByIdIncludingDeleted.mockResolvedValue(makeRow());

    await service.remove(WS_ID, TYPE_ID);

    expect(repository.softDeleteWithCascadeNull).toHaveBeenCalledWith(TYPE_ID);
    expect(redis.publish).toHaveBeenCalledWith(
      CustomTaskTypesService.INVALIDATION_CHANNEL,
      `ws:${WS_ID}`,
    );
  });
});

describe('CustomTaskTypesService.create', () => {
  it('404 quando spaceId nao pertence ao workspace', async () => {
    const { service, repository } = buildService();
    repository.spaceBelongsToWorkspace.mockResolvedValue(false);

    await expect(
      service.create(WS_ID, { value: 'Novo' }, USER_ID, SPACE_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('409 quando nameExists', async () => {
    const { service, repository } = buildService();
    repository.nameExists.mockResolvedValue(true);

    await expect(
      service.create(WS_ID, { value: 'Pedido' }, USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('sucesso: passa creatorId e spaceId pro repository e invalida cache', async () => {
    const { service, repository, redis } = buildService();
    repository.spaceBelongsToWorkspace.mockResolvedValue(true);
    repository.nameExists.mockResolvedValue(false);
    repository.create.mockResolvedValue(
      makeRow({ creatorId: USER_ID, spaceId: SPACE_ID }),
    );

    await service.create(
      WS_ID,
      { value: 'Novo', pluralName: 'Novos' },
      USER_ID,
      SPACE_ID,
    );

    expect(repository.create).toHaveBeenCalledWith(
      WS_ID,
      expect.objectContaining({
        name: 'Novo',
        namePlural: 'Novos',
        creatorId: USER_ID,
        spaceId: SPACE_ID,
      }),
    );
    expect(redis.publish).toHaveBeenCalledWith(
      CustomTaskTypesService.INVALIDATION_CHANNEL,
      `ws:${WS_ID}`,
    );
  });

  it('409 quando race condition gera P2002 no banco', async () => {
    const { service, repository } = buildService();
    repository.nameExists.mockResolvedValue(false);
    repository.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('race', {
        code: 'P2002',
        clientVersion: '5.0.0',
      }),
    );

    await expect(
      service.create(WS_ID, { value: 'Novo' }, USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('CustomTaskTypesService.listBySpace', () => {
  it('404 quando space nao pertence ao workspace', async () => {
    const { service, repository } = buildService();
    repository.spaceBelongsToWorkspace.mockResolvedValue(false);

    await expect(
      service.listBySpace(WS_ID, SPACE_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findManyBySpace).not.toHaveBeenCalled();
  });

  it('retorna array de DTOs filtrado por space', async () => {
    const { service, repository } = buildService();
    repository.spaceBelongsToWorkspace.mockResolvedValue(true);
    repository.findManyBySpace.mockResolvedValue([
      makeRow({ id: 'ct-1', spaceId: SPACE_ID }),
      makeRow({ id: 'ct-2', spaceId: SPACE_ID, name: 'Outro' }),
    ]);

    const result = await service.listBySpace(WS_ID, SPACE_ID);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'ct-1', value: 'Pedido' });
    expect(result[1]).toMatchObject({ id: 'ct-2', value: 'Outro' });
    expect(repository.findManyBySpace).toHaveBeenCalledWith(WS_ID, SPACE_ID);
  });
});
