/**
 * Unit tests — CustomFieldsWriteGuard (PLANO-TASK-TYPES-TEMPLATES Sprint 5,
 * TTT-051 — evolucao para padrao per-workspace alinhado a TasksFeatureFlagGuard).
 *
 * Cobre os 6 cenarios canonicos:
 *   1. Kill switch OFF → 404 independente do workspace.
 *   2. Kill switch ON + flag workspace ON → permite.
 *   3. Kill switch ON + flag workspace OFF → 404.
 *   4. Kill switch ON + flag workspace ausente → 404.
 *   5. Cache hit (nao chama Prisma 2 vezes em 60s).
 *   6. Fail-open em erro de DB.
 */

import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CustomFieldsWriteGuard } from './custom-fields-write.guard';
import { PrismaService } from '../../database/prisma.service';

type WorkspaceFindUniqueMock = jest.Mock<
  Promise<{ settings: Record<string, unknown> | null } | null>,
  unknown[]
>;

type PrismaMock = {
  workspace: { findUnique: WorkspaceFindUniqueMock };
};

const buildContext = (workspaceId?: string): ExecutionContext => {
  const request = workspaceId
    ? { user: { workspaceId } }
    : { user: undefined };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({ name: 'createDefinition' }),
    getClass: () => ({ name: 'CustomFieldDefinitionsController' }),
  } as unknown as ExecutionContext;
};

const buildGuard = async (
  globalEnabled: boolean,
  prisma: PrismaMock,
): Promise<CustomFieldsWriteGuard> => {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      CustomFieldsWriteGuard,
      { provide: PrismaService, useValue: prisma },
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn(
            (key: string, defaultVal?: unknown): unknown => {
              if (key === 'FEATURE_CUSTOM_FIELDS_WRITE_ENABLED')
                return globalEnabled;
              return defaultVal;
            },
          ),
        },
      },
    ],
  }).compile();

  return moduleRef.get(CustomFieldsWriteGuard);
};

describe('CustomFieldsWriteGuard', () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = {
      workspace: { findUnique: jest.fn() },
    };
  });

  it('1. kill switch OFF → 404 independente do workspace', async () => {
    const guard = await buildGuard(false, prisma);
    prisma.workspace.findUnique.mockResolvedValue({
      settings: { featureCustomFieldsWriteEnabled: true },
    });

    await expect(guard.canActivate(buildContext('ws-1'))).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.workspace.findUnique).not.toHaveBeenCalled();
  });

  it('2. kill switch ON + flag workspace ON → permite', async () => {
    const guard = await buildGuard(true, prisma);
    prisma.workspace.findUnique.mockResolvedValue({
      settings: { featureCustomFieldsWriteEnabled: true },
    });

    await expect(guard.canActivate(buildContext('ws-1'))).resolves.toBe(true);
    expect(prisma.workspace.findUnique).toHaveBeenCalledTimes(1);
  });

  it('3. kill switch ON + flag workspace OFF → 404', async () => {
    const guard = await buildGuard(true, prisma);
    prisma.workspace.findUnique.mockResolvedValue({
      settings: { featureCustomFieldsWriteEnabled: false },
    });

    await expect(guard.canActivate(buildContext('ws-1'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('4. kill switch ON + flag workspace ausente → 404', async () => {
    const guard = await buildGuard(true, prisma);
    prisma.workspace.findUnique.mockResolvedValue({ settings: {} });

    await expect(guard.canActivate(buildContext('ws-1'))).rejects.toThrow(
      NotFoundException,
    );

    // Tambem cobre settings = null.
    prisma.workspace.findUnique.mockResolvedValue({ settings: null });
    await expect(guard.canActivate(buildContext('ws-2'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('5. cache hit: nao chama Prisma 2 vezes em 60s', async () => {
    const guard = await buildGuard(true, prisma);
    prisma.workspace.findUnique.mockResolvedValue({
      settings: { featureCustomFieldsWriteEnabled: true },
    });

    // Primeira chamada: cache miss → prisma 1x.
    await guard.canActivate(buildContext('ws-1'));
    // Segunda chamada dentro do TTL: cache hit → prisma nao chamado de novo.
    await guard.canActivate(buildContext('ws-1'));
    // Terceira chamada: ainda cache hit.
    await guard.canActivate(buildContext('ws-1'));

    expect(prisma.workspace.findUnique).toHaveBeenCalledTimes(1);
  });

  it('5b. cache hit negativo: 404 sem nova consulta a Prisma', async () => {
    const guard = await buildGuard(true, prisma);
    prisma.workspace.findUnique.mockResolvedValue({
      settings: { featureCustomFieldsWriteEnabled: false },
    });

    await expect(guard.canActivate(buildContext('ws-1'))).rejects.toThrow(
      NotFoundException,
    );
    await expect(guard.canActivate(buildContext('ws-1'))).rejects.toThrow(
      NotFoundException,
    );

    expect(prisma.workspace.findUnique).toHaveBeenCalledTimes(1);
  });

  it('6. fail-open em erro de DB → libera e loga warn', async () => {
    const guard = await buildGuard(true, prisma);
    const warnSpy = jest
      .spyOn((guard as unknown as { logger: { warn: jest.Mock } }).logger, 'warn')
      .mockImplementation(() => undefined);
    prisma.workspace.findUnique.mockRejectedValue(new Error('connection lost'));

    await expect(guard.canActivate(buildContext('ws-1'))).resolves.toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('libera quando request nao tem workspaceId (delegado ao WorkspaceGuard)', async () => {
    const guard = await buildGuard(true, prisma);

    await expect(guard.canActivate(buildContext(undefined))).resolves.toBe(
      true,
    );
    expect(prisma.workspace.findUnique).not.toHaveBeenCalled();
  });
});
