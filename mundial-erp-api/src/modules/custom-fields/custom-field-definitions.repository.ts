import { Injectable } from '@nestjs/common';
import { CustomFieldDefinition, CustomFieldType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Repository de `CustomFieldDefinition`.
 *
 * Encapsula todas as queries do delegate `customFieldDefinition`.
 * Multi-tenancy: o filtro `(workspaceId = current OR workspaceId IS NULL)`
 * eh aplicado em TODAS as leituras (builtins globais + workspace atual).
 *
 * Cross-tenant em mutacoes:
 *   - update/softDelete usam `findFirst` com `workspaceId = current` antes da
 *     escrita; se nao encontra, service responde 404 (nunca 403).
 *   - Builtin (workspaceId NULL) nao eh editavel via API — checagem em service.
 *
 * Budget: cada metodo respeita <= 2 queries por chamada.
 */

export interface CreateData {
  workspaceId: string;
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  config: Prisma.InputJsonValue | null;
  sortOrder: number;
  spaceId?: string | null;
  folderId?: string | null;
  listId?: string | null;
  customTaskTypeId?: string | null;
}

export interface UpdateData {
  label?: string;
  required?: boolean;
  config?: Prisma.InputJsonValue | null;
  sortOrder?: number;
}

@Injectable()
export class CustomFieldDefinitionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca por id com escopo de visibilidade. Retorna `null` se cross-tenant
   * (caller deve responder 404 sem vazar existencia).
   */
  async findVisibleById(workspaceId: string, id: string) {
    return this.prisma.customFieldDefinition.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
    });
  }

  /**
   * Busca por id restrito ao workspace dono (nao retorna builtin).
   * Usado em update/delete onde builtins nao sao editaveis.
   */
  async findOwnedById(
    workspaceId: string,
    id: string,
  ): Promise<CustomFieldDefinition | null> {
    return this.prisma.customFieldDefinition.findFirst({
      where: {
        id,
        workspaceId,
        deletedAt: null,
      },
    });
  }

  async findByKey(workspaceId: string, key: string) {
    return this.prisma.customFieldDefinition.findFirst({
      where: {
        workspaceId,
        key,
        deletedAt: null,
      },
    });
  }

  async create(data: CreateData): Promise<CustomFieldDefinition> {
    return this.prisma.customFieldDefinition.create({
      data: {
        workspaceId: data.workspaceId,
        key: data.key,
        label: data.label,
        type: data.type,
        required: data.required,
        config: data.config ?? Prisma.JsonNull,
        sortOrder: data.sortOrder,
        isBuiltin: false,
        spaceId: data.spaceId ?? null,
        folderId: data.folderId ?? null,
        listId: data.listId ?? null,
        customTaskTypeId: data.customTaskTypeId ?? null,
      },
    });
  }

  async findAllVisible(workspaceId: string) {
    return this.prisma.customFieldDefinition.findMany({
      where: {
        deletedAt: null,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      orderBy: [{ isBuiltin: 'desc' }, { sortOrder: 'asc' }, { key: 'asc' }],
    });
  }

  async update(id: string, data: UpdateData): Promise<CustomFieldDefinition> {
    return this.prisma.customFieldDefinition.update({
      where: { id },
      data: {
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.required !== undefined ? { required: data.required } : {}),
        ...(data.config !== undefined
          ? { config: data.config ?? Prisma.JsonNull }
          : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
  }

  async softDelete(id: string): Promise<CustomFieldDefinition> {
    return this.prisma.customFieldDefinition.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
