import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TaskActivityType } from '@prisma/client';
import { TaskActivitiesRepository } from './task-activities.repository';
import { ActivityFiltersDto } from './dtos/activity-filters.dto';
import {
  ActivitiesListResponseDto,
  ActivityResponseDto,
  type ActivityShape,
} from './dtos/activity-response.dto';

/**
 * TaskActivitiesService (READ-ONLY).
 * ADR-002: toda escrita em WorkItemActivity e feita APENAS pelo worker
 * do task-outbox. Aqui so lemos.
 */
@Injectable()
export class TaskActivitiesService {
  private readonly validActivityTypes = new Set<string>(Object.values(TaskActivityType));

  constructor(private readonly repository: TaskActivitiesRepository) {}

  async findByTask(
    workspaceId: string,
    taskId: string,
    filters: ActivityFiltersDto,
  ): Promise<ActivitiesListResponseDto> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    const actions = this.parseActions(filters.action);
    const cursorDate = this.parseCursor(filters.cursor);

    const { items, total } = await this.repository.findByTask(
      workspaceId,
      taskId,
      {
        skip: filters.skip,
        take: filters.limit,
        type: filters.type ?? 'ALL',
        actions,
        actorId: filters.actorId,
        cursor: cursorDate,
      },
    );
    const enriched = await this.enrichStatusPayloads(
      items as unknown as ActivityShape[],
    );
    const response = new ActivitiesListResponseDto();
    response.items = enriched.map((r) => ActivityResponseDto.fromEntity(r));
    response.total = total;
    return response;
  }

  /**
   * Enriquece payloads de STATUS_CHANGED (e CREATED com statusId) com
   * `{ id, name, color }` via bulk lookup. Mantém o restante do payload
   * intacto — consumer que ignora os novos campos continua funcional.
   */
  private async enrichStatusPayloads(
    items: ActivityShape[],
  ): Promise<ActivityShape[]> {
    const ids = new Set<string>();
    for (const it of items) {
      const p = (it.payload ?? {}) as Record<string, unknown>;
      if (it.type === 'STATUS_CHANGED') {
        if (typeof p.from === 'string') ids.add(p.from);
        if (typeof p.to === 'string') ids.add(p.to);
      } else if (it.type === 'CREATED') {
        if (typeof p.statusId === 'string') ids.add(p.statusId);
      }
    }
    if (ids.size === 0) return items;

    const statuses = await this.repository.findStatusesByIds([...ids]);
    const byId = new Map(statuses.map((s) => [s.id, s]));

    return items.map((it) => {
      const p = (it.payload ?? {}) as Record<string, unknown>;
      if (it.type === 'STATUS_CHANGED') {
        return {
          ...it,
          payload: {
            ...p,
            fromStatus:
              typeof p.from === 'string' ? byId.get(p.from) ?? null : null,
            toStatus:
              typeof p.to === 'string' ? byId.get(p.to) ?? null : null,
          },
        };
      }
      if (it.type === 'CREATED' && typeof p.statusId === 'string') {
        return {
          ...it,
          payload: { ...p, status: byId.get(p.statusId) ?? null },
        };
      }
      return it;
    });
  }

  private parseActions(raw?: string): TaskActivityType[] | undefined {
    if (!raw) return undefined;
    const tokens = raw
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (tokens.length === 0) return undefined;

    const invalid = tokens.filter((t) => !this.validActivityTypes.has(t));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `action contem valor(es) invalido(s): ${invalid.join(', ')}`,
      );
    }
    return tokens as TaskActivityType[];
  }

  private parseCursor(raw?: string): Date | undefined {
    if (!raw) return undefined;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('cursor deve ser ISO 8601 datetime valido');
    }
    return d;
  }
}
