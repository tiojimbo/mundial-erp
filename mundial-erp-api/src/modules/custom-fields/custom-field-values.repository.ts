import { Injectable } from '@nestjs/common';
import {
  CustomFieldDefinition,
  CustomFieldValue,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Repository de `CustomFieldValue`.
 *
 * Acoplamento:
 *   - Para upsert e listagem, faz join com `CustomFieldDefinition` (filtra
 *     `deletedAt IS NULL`). Soft-deleted definitions sao ocultadas mas seus
 *     values permanecem orfaos (PLANO §"Regras de Negocio" #5).
 *   - Workspace eh validado via `WorkItem.process.department.workspaceId` no
 *     repository (consulta especifica). Cross-tenant retorna `null` -> 404.
 */

export interface UpsertValueData {
  workItemId: string;
  definitionId: string;
  valueText: string | null;
  valueNumber: number | null;
  valueDate: Date | null;
  valueJson: Prisma.InputJsonValue | null;
  valueBoolean: boolean | null;
}

export type ValueWithDefinition = CustomFieldValue & {
  definition: CustomFieldDefinition;
};

@Injectable()
export class CustomFieldValuesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica se `taskId` (work item) pertence ao workspace e retorna o id.
   * Usado antes de qualquer leitura/escrita de valor para garantir tenancy.
   * Cross-tenant -> `null` (caller responde 404).
   */
  async findTaskInWorkspace(workspaceId: string, taskId: string) {
    return this.prisma.workItem.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        list: { space: { workspaceId } },
      },
      select: { id: true },
    });
  }

  /**
   * Lista valores de uma task, joinando com a definicao. Apenas definicoes
   * visiveis ao workspace (builtin ou propria) e nao soft-deletadas.
   */
  async findValuesForTask(
    workspaceId: string,
    workItemId: string,
  ): Promise<ValueWithDefinition[]> {
    return this.prisma.customFieldValue.findMany({
      where: {
        workItemId,
        definition: {
          deletedAt: null,
          OR: [{ workspaceId }, { workspaceId: null }],
        },
      },
      include: { definition: true },
      orderBy: [
        { definition: { sortOrder: 'asc' } },
        { definition: { key: 'asc' } },
      ],
    });
  }

  async findValueByPair(
    workItemId: string,
    definitionId: string,
  ): Promise<ValueWithDefinition | null> {
    return this.prisma.customFieldValue.findUnique({
      where: { workItemId_definitionId: { workItemId, definitionId } },
      include: { definition: true },
    });
  }

  /**
   * Upsert de valor por `(workItemId, definitionId)`. Caller passa as 3 colunas
   * de valor (valueText/valueNumber/valueDate); o dispatcher do service garante
   * que apenas uma esta preenchida.
   *
   * Aceita `tx` opcional para participar da $transaction primaria do caller
   * (necessario para garantir atomicidade outbox + valor — PLANO §"Regras" #1).
   */
  async deleteValue(
    workItemId: string,
    definitionId: string,
  ): Promise<ValueWithDefinition | null> {
    const current = await this.findValueByPair(workItemId, definitionId);
    if (!current) return null;
    await this.prisma.customFieldValue.delete({
      where: { workItemId_definitionId: { workItemId, definitionId } },
    });
    return current;
  }

  async upsertValue(
    data: UpsertValueData,
    tx?: Prisma.TransactionClient,
  ): Promise<ValueWithDefinition> {
    const db = tx ?? this.prisma;
    return db.customFieldValue.upsert({
      where: {
        workItemId_definitionId: {
          workItemId: data.workItemId,
          definitionId: data.definitionId,
        },
      },
      create: {
        workItemId: data.workItemId,
        definitionId: data.definitionId,
        valueText: data.valueText,
        valueNumber: data.valueNumber,
        valueDate: data.valueDate,
        valueJson: data.valueJson ?? Prisma.JsonNull,
        valueBoolean: data.valueBoolean,
      },
      update: {
        valueText: data.valueText,
        valueNumber: data.valueNumber,
        valueDate: data.valueDate,
        valueJson: data.valueJson ?? Prisma.JsonNull,
        valueBoolean: data.valueBoolean,
      },
      include: { definition: true },
    });
  }
}
