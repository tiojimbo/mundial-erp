import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Shape canonico retornado por leituras do repository — corresponde ao
 * `findFirst`/`findMany` com include completo de `fields.definition`.
 *
 * Mantemos esta interface explicita para que o service e o DTO de resposta
 * dependam de um contrato estavel, sem importar tipos gerados pelo Prisma
 * em camadas superiores.
 */
export interface TaskTypeTemplateWithFields {
  id: string;
  customTaskTypeId: string;
  attachmentCategories: Prisma.JsonValue | null;
  defaultDescriptionBlocks: Prisma.JsonValue | null;
  hasDescription: boolean;
  defaultDescriptionHtml: string | null;
  createdAt: Date;
  updatedAt: Date;
  fields: Array<{
    definitionId: string;
    sortOrder: number;
    requiredOverride: boolean | null;
    definition: {
      id: string;
      key: string;
      label: string;
      type: import('@prisma/client').CustomFieldType;
      required: boolean;
      config: Prisma.JsonValue | null;
      sortOrder: number;
      isBuiltin: boolean;
    };
  }>;
}

/**
 * Repository de `TaskTypeTemplate` (M2 — read-only).
 *
 * Multi-tenancy:
 *   Visibilidade do template e derivada do `CustomTaskType.workspaceId`:
 *     - workspaceId NULL  -> builtin global, visivel a todos.
 *     - workspaceId == ws -> proprio do workspace.
 *     - cross-tenant      -> filtrado fora; service responde 404.
 *
 * Soft delete:
 *   Aplicamos `deletedAt: null` no template e em cada definition referenciada
 *   (PLANO §"Riscos" — definitions soft-deletadas nao devem ser exibidas).
 *
 * Budget de queries (PLANO TTT-031 AC):
 *   - findByCustomTaskTypeId: 1 query (Prisma constroi JOIN do include).
 *   - findVisibleAll: 1 query (mesma forma).
 */
@Injectable()
export class TaskTypeTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca pelo `customTaskTypeId` (lookup natural — a relacao e 1:1 e isso
   * evita o cliente ter que descobrir o template id antes).
   *
   * Visibilidade do CustomTaskType pai e aplicada inline (`OR builtin OR own`)
   * — sem isto, um id de outro tenant retornaria template inadvertidamente.
   */
  async findByCustomTaskTypeId(
    customTaskTypeId: string,
    workspaceId: string,
  ): Promise<TaskTypeTemplateWithFields | null> {
    const row = await this.prisma.taskTypeTemplate.findFirst({
      where: {
        customTaskTypeId,
        deletedAt: null,
        customTaskType: {
          OR: [{ workspaceId: null }, { workspaceId }],
          deletedAt: null,
        },
      },
      select: {
        id: true,
        customTaskTypeId: true,
        attachmentCategories: true,
        defaultDescriptionBlocks: true,
        hasDescription: true,
        defaultDescriptionHtml: true,
        createdAt: true,
        updatedAt: true,
        fields: {
          where: { definition: { deletedAt: null } },
          orderBy: { sortOrder: 'asc' },
          select: {
            definitionId: true,
            sortOrder: true,
            requiredOverride: true,
            definition: {
              select: {
                id: true,
                key: true,
                label: true,
                type: true,
                required: true,
                config: true,
                sortOrder: true,
                isBuiltin: true,
              },
            },
          },
        },
      },
    });
    return row;
  }

  /**
   * Lista templates visiveis ao workspace (builtins + proprios). Mesma
   * projecao do `findByCustomTaskTypeId` para que o service serialize com
   * o mesmo DTO.
   *
   * Ordem: builtin primeiro (NULL workspaceId no pai), depois pelos proprios.
   * O Prisma nao expoe ORDER BY em campos de relacao via `orderBy` direto,
   * entao usamos ordenacao no nivel de fields apenas; o service pode
   * re-ordenar se quiser, mas aqui devolvemos a lista crua.
   *
   * Budget: 1 query principal com JOIN do include.
   */
  async findVisibleAll(
    workspaceId: string,
  ): Promise<TaskTypeTemplateWithFields[]> {
    return this.prisma.taskTypeTemplate.findMany({
      where: {
        deletedAt: null,
        customTaskType: {
          OR: [{ workspaceId: null }, { workspaceId }],
          deletedAt: null,
        },
      },
      orderBy: [{ customTaskType: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
      select: {
        id: true,
        customTaskTypeId: true,
        attachmentCategories: true,
        defaultDescriptionBlocks: true,
        hasDescription: true,
        defaultDescriptionHtml: true,
        createdAt: true,
        updatedAt: true,
        fields: {
          where: { definition: { deletedAt: null } },
          orderBy: { sortOrder: 'asc' },
          select: {
            definitionId: true,
            sortOrder: true,
            requiredOverride: true,
            definition: {
              select: {
                id: true,
                key: true,
                label: true,
                type: true,
                required: true,
                config: true,
                sortOrder: true,
                isBuiltin: true,
              },
            },
          },
        },
      },
    });
  }
}
