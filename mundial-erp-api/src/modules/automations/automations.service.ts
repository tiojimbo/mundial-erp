import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AutomationScopeType, AutomationTrigger, Prisma } from '@prisma/client';
import { AutomationsRepository, ListFilters } from './automations.repository';
import { TRIGGERS_CATALOG } from './catalog/triggers.catalog';
import { ACTION_IDS, ACTIONS_CATALOG } from './catalog/actions.catalog';
import { ActionDef, TriggerDef } from './catalog/types';
import { CreateAutomationDto } from './dtos/create-automation.dto';
import { UpdateAutomationDto } from './dtos/update-automation.dto';

const ACTION_ID_SET = new Set<string>(ACTION_IDS);

@Injectable()
export class AutomationsService {
  constructor(private readonly repository: AutomationsRepository) {}

  listTriggers(): TriggerDef[] {
    return [...TRIGGERS_CATALOG];
  }

  listActions(): ActionDef[] {
    return [...ACTIONS_CATALOG];
  }

  async listStatusesByScope(workspaceId: string) {
    const rows = await this.repository.listWorkflowStatusesByScope(workspaceId);

    const spaceMap = new Map<
      string,
      { id: string; name: string; statuses: typeof rows }
    >();
    const folderMap = new Map<
      string,
      {
        id: string;
        name: string;
        spaceId: string;
        statuses: typeof rows;
      }
    >();

    for (const row of rows) {
      if (row.folderId) {
        const key = row.folderId;
        if (!folderMap.has(key) && row.folder) {
          folderMap.set(key, {
            id: row.folder.id,
            name: row.folder.name,
            spaceId: row.folder.spaceId,
            statuses: [],
          });
        }
        folderMap.get(key)!.statuses.push(row);
      } else {
        const key = row.spaceId;
        if (!spaceMap.has(key)) {
          spaceMap.set(key, {
            id: row.space.id,
            name: row.space.name,
            statuses: [],
          });
        }
        spaceMap.get(key)!.statuses.push(row);
      }
    }

    return {
      spaces: [...spaceMap.values()],
      folders: [...folderMap.values()],
    };
  }

  list(workspaceId: string, filters: ListFilters) {
    return this.repository.list(workspaceId, filters);
  }

  async findById(workspaceId: string, id: string) {
    const automation = await this.repository.findById(workspaceId, id);
    if (!automation) {
      throw new NotFoundException(`Automation ${id} não encontrada`);
    }
    return automation;
  }

  async create(
    workspaceId: string,
    createdById: string,
    dto: CreateAutomationDto,
  ) {
    this.validateScope(dto.scopeType, dto.scopeId);
    this.validateActions(dto.compiledActions);
    this.validateCron(dto.trigger, dto.cronExpression);

    return this.repository.create({
      workspaceId,
      createdById,
      name: dto.name,
      description: dto.description ?? null,
      trigger: dto.trigger,
      scopeType: dto.scopeType,
      scopeId: dto.scopeId ?? null,
      compiledActions: dto.compiledActions as unknown as Prisma.InputJsonValue,
      conditions: (dto.conditions ?? []) as unknown as Prisma.InputJsonValue,
      isActive: dto.isActive ?? true,
      cronExpression: dto.cronExpression ?? null,
      timezone: dto.timezone ?? null,
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateAutomationDto) {
    await this.findById(workspaceId, id);

    if (dto.scopeType !== undefined) {
      this.validateScope(dto.scopeType, dto.scopeId);
    }
    if (dto.compiledActions !== undefined) {
      this.validateActions(dto.compiledActions);
    }
    if (dto.trigger !== undefined || dto.cronExpression !== undefined) {
      const trigger = dto.trigger ?? AutomationTrigger.TASK_CREATED;
      this.validateCron(trigger, dto.cronExpression);
    }

    return this.repository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.trigger !== undefined && { trigger: dto.trigger }),
      ...(dto.scopeType !== undefined && { scopeType: dto.scopeType }),
      ...(dto.scopeId !== undefined && { scopeId: dto.scopeId }),
      ...(dto.compiledActions !== undefined && {
        compiledActions: dto.compiledActions as unknown as Prisma.InputJsonValue,
      }),
      ...(dto.conditions !== undefined && {
        conditions: dto.conditions as unknown as Prisma.InputJsonValue,
      }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.cronExpression !== undefined && {
        cronExpression: dto.cronExpression,
      }),
      ...(dto.timezone !== undefined && { timezone: dto.timezone }),
    });
  }

  async remove(workspaceId: string, id: string) {
    await this.findById(workspaceId, id);
    return this.repository.softDelete(id);
  }

  async toggle(workspaceId: string, id: string) {
    const current = await this.findById(workspaceId, id);
    return this.repository.update(id, { isActive: !current.isActive });
  }

  private validateScope(
    scopeType: AutomationScopeType,
    scopeId: string | undefined | null,
  ) {
    if (scopeType === AutomationScopeType.WORKSPACE) {
      if (scopeId) {
        throw new BadRequestException(
          'scopeId não deve ser informado quando scopeType=WORKSPACE',
        );
      }
      return;
    }
    if (!scopeId) {
      throw new BadRequestException(
        `scopeId é obrigatório quando scopeType=${scopeType}`,
      );
    }
  }

  private validateActions(actions: { type: string }[]) {
    for (const action of actions) {
      if (!ACTION_ID_SET.has(action.type)) {
        throw new BadRequestException(`Action desconhecida: ${action.type}`);
      }
    }
  }

  private validateCron(
    trigger: AutomationTrigger,
    cronExpression: string | undefined | null,
  ) {
    if (trigger === AutomationTrigger.CRON && !cronExpression) {
      throw new BadRequestException(
        'cronExpression é obrigatório quando trigger=CRON',
      );
    }
    if (trigger !== AutomationTrigger.CRON && cronExpression) {
      throw new BadRequestException(
        'cronExpression só é válido para trigger=CRON',
      );
    }
  }
}
