import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CustomFieldType, Prisma } from '@prisma/client';
import { CustomFieldDefinitionsRepository } from './custom-field-definitions.repository';
import { CustomFieldGroupsRepository } from './groups/custom-field-groups.repository';
import { CreateCustomFieldDefinitionDto } from './dtos/create-custom-field-definition.dto';
import { UpdateCustomFieldDefinitionDto } from './dtos/update-custom-field-definition.dto';
import { CustomFieldDefinitionResponseDto } from './dtos/custom-field-definition-response.dto';
import { AddCustomFieldLocationDto } from './dtos/custom-field-location.dto';
import { GroupedCustomFieldsResponseDto } from './dtos/grouped-custom-fields-response.dto';
import { ListCustomFieldsQueryDto } from './dtos/list-custom-fields-query.dto';
import { ManagerScope } from './dtos/manager-custom-fields-query.dto';
import {
  ManagerCustomFieldItemDto,
  ManagerCustomFieldLocationDto,
} from './dtos/manager-custom-fields-response.dto';
import {
  CUSTOM_FIELDS_METRICS,
  type CustomFieldsMetrics,
} from './custom-fields.metrics';

const BUILTIN_LOCK_MESSAGE = 'Builtin custom field definitions are read-only';
const KEY_REGEX = /^[a-z][a-z0-9_]*$/;

export type CustomFieldWithLocations = CustomFieldDefinitionResponseDto & {
  lists: Array<{
    id: string;
    customFieldId: string;
    listId: string;
    groupId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  folders: Array<{
    id: string;
    customFieldId: string;
    folderId: string;
    groupId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  spaces: Array<{
    id: string;
    customFieldId: string;
    spaceId: string;
    groupId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

@Injectable()
export class CustomFieldDefinitionsService {
  private readonly logger = new Logger(CustomFieldDefinitionsService.name);

  constructor(
    private readonly repository: CustomFieldDefinitionsRepository,
    private readonly groupsRepository: CustomFieldGroupsRepository,
    @Inject(CUSTOM_FIELDS_METRICS)
    private readonly metrics: CustomFieldsMetrics,
  ) {}

  async list(
    workspaceId: string,
    filters: ListCustomFieldsQueryDto = {},
  ): Promise<GroupedCustomFieldsResponseDto> {
    const all = await this.repository.findAllVisible(workspaceId);
    const links = await this.repository.findScopeLinks(all.map((e) => e.id));

    const listIdsOf = (e: { id: string; listId: string | null }) => {
      const s = new Set(links.get(e.id)?.listIds ?? []);
      if (e.listId) s.add(e.listId);
      return s;
    };
    const folderIdsOf = (e: { id: string; folderId: string | null }) => {
      const s = new Set(links.get(e.id)?.folderIds ?? []);
      if (e.folderId) s.add(e.folderId);
      return s;
    };
    const spaceIdsOf = (e: { id: string; spaceId: string | null }) => {
      const s = new Set(links.get(e.id)?.spaceIds ?? []);
      if (e.spaceId) s.add(e.spaceId);
      return s;
    };

    const hasFilter = Boolean(
      filters.spaceId ||
      filters.folderId ||
      filters.listId ||
      filters.taskTypeId,
    );

    const grouped: GroupedCustomFieldsResponseDto = {
      workspace: [],
      space: [],
      folder: [],
      list: [],
      taskType: [],
    };

    const isWorkspaceLevel = (entity: (typeof all)[number]): boolean =>
      (entity.workspaceId === workspaceId || entity.workspaceId === null) &&
      !entity.customTaskTypeId &&
      listIdsOf(entity).size === 0 &&
      folderIdsOf(entity).size === 0 &&
      spaceIdsOf(entity).size === 0;

    if (!hasFilter) {
      grouped.workspace = all.filter(isWorkspaceLevel).map((entity) =>
        CustomFieldDefinitionResponseDto.fromEntity(entity, {
          exposeWorkspaceId: entity.workspaceId === workspaceId,
        }),
      );
      return grouped;
    }

    let ancestorFolderId: string | null = null;
    let ancestorSpaceId: string | null = null;
    if (filters.listId) {
      const hierarchy = await this.repository.findListHierarchy(
        workspaceId,
        filters.listId,
      );
      ancestorFolderId = hierarchy?.folderId ?? null;
      ancestorSpaceId = hierarchy?.spaceId ?? null;
    } else if (filters.folderId) {
      const hierarchy = await this.repository.findFolderHierarchy(
        workspaceId,
        filters.folderId,
      );
      ancestorSpaceId = hierarchy?.spaceId ?? null;
    } else if (filters.spaceId) {
      ancestorSpaceId = filters.spaceId;
    }

    const toDto = (entity: (typeof all)[number]) =>
      CustomFieldDefinitionResponseDto.fromEntity(entity, {
        exposeWorkspaceId: entity.workspaceId === workspaceId,
      });

    for (const entity of all) {
      const L = listIdsOf(entity);
      const F = folderIdsOf(entity);
      const S = spaceIdsOf(entity);

      if (filters.listId && L.has(filters.listId)) {
        grouped.list.push(toDto(entity));
      }
      if (ancestorFolderId && F.has(ancestorFolderId) && !filters.folderId) {
        grouped.folder.push(toDto(entity));
      }
      if (filters.folderId && F.has(filters.folderId)) {
        grouped.folder.push(toDto(entity));
      }
      if (ancestorSpaceId && S.has(ancestorSpaceId) && !filters.spaceId) {
        grouped.space.push(toDto(entity));
      }
      if (filters.spaceId && S.has(filters.spaceId)) {
        grouped.space.push(toDto(entity));
      }
      if (
        filters.taskTypeId &&
        entity.customTaskTypeId === filters.taskTypeId
      ) {
        grouped.taskType.push(toDto(entity));
      }
    }
    return grouped;
  }

  async manager(
    workspaceId: string,
    scope: ManagerScope,
    filters: {
      spaceId?: string;
      folderId?: string;
      listId?: string;
      taskTypeId?: string;
    },
  ): Promise<ManagerCustomFieldItemDto[]> {
    const all = await this.repository.findAllVisible(workspaceId);
    const links = await this.repository.findScopeLinks(all.map((e) => e.id));

    const listIdsOf = (e: { id: string; listId: string | null }) => {
      const s = new Set(links.get(e.id)?.listIds ?? []);
      if (e.listId) s.add(e.listId);
      return s;
    };
    const folderIdsOf = (e: { id: string; folderId: string | null }) => {
      const s = new Set(links.get(e.id)?.folderIds ?? []);
      if (e.folderId) s.add(e.folderId);
      return s;
    };
    const spaceIdsOf = (e: { id: string; spaceId: string | null }) => {
      const s = new Set(links.get(e.id)?.spaceIds ?? []);
      if (e.spaceId) s.add(e.spaceId);
      return s;
    };
    const isWorkspaceLevel = (entity: (typeof all)[number]): boolean =>
      (entity.workspaceId === workspaceId || entity.workspaceId === null) &&
      !entity.customTaskTypeId &&
      listIdsOf(entity).size === 0 &&
      folderIdsOf(entity).size === 0 &&
      spaceIdsOf(entity).size === 0;

    const scoped = all.filter((entity) => {
      const L = listIdsOf(entity);
      const F = folderIdsOf(entity);
      const S = spaceIdsOf(entity);
      switch (scope) {
        case 'all':
          return true;
        case 'workspace':
          return isWorkspaceLevel(entity);
        case 'list':
          return filters.listId ? L.has(filters.listId) : L.size > 0;
        case 'folder':
          return filters.folderId ? F.has(filters.folderId) : F.size > 0;
        case 'space':
          return filters.spaceId ? S.has(filters.spaceId) : S.size > 0;
        case 'taskType':
          return filters.taskTypeId
            ? entity.customTaskTypeId === filters.taskTypeId
            : Boolean(entity.customTaskTypeId);
        default:
          return false;
      }
    });

    const ids = scoped.map((entity) => entity.id);
    const [usageMap, taskTypeMap] = await Promise.all([
      this.repository.countValuesByDefinition(ids),
      this.repository.findTaskTypesForDefinitions(ids),
    ]);

    return scoped.map((entity) => {
      const base = CustomFieldDefinitionResponseDto.fromEntity(entity, {
        exposeWorkspaceId: entity.workspaceId === workspaceId,
      });
      const locations: ManagerCustomFieldLocationDto[] = [];
      for (const id of listIdsOf(entity)) {
        locations.push({ type: 'list', id });
      }
      for (const id of folderIdsOf(entity)) {
        locations.push({ type: 'folder', id });
      }
      for (const id of spaceIdsOf(entity)) {
        locations.push({ type: 'space', id });
      }
      const taskType = taskTypeMap.get(entity.id);
      const item: ManagerCustomFieldItemDto = {
        ...base,
        usageCount: usageMap.get(entity.id) ?? 0,
        locations,
        taskTypes: taskType ? [taskType] : [],
      };
      return item;
    });
  }

  async findOne(
    workspaceId: string,
    id: string,
  ): Promise<CustomFieldDefinitionResponseDto> {
    const entity = await this.repository.findVisibleById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }
    return CustomFieldDefinitionResponseDto.fromEntity(entity, {
      exposeWorkspaceId: entity.workspaceId === workspaceId,
    });
  }

  async create(
    workspaceId: string,
    dto: CreateCustomFieldDefinitionDto,
    userId: string | null,
  ): Promise<CustomFieldDefinitionResponseDto> {
    const taskTypeId = dto.taskTypeId ?? dto.customTaskTypeId ?? null;

    const scopes = [dto.spaceId, dto.folderId, dto.listId, taskTypeId].filter(
      Boolean,
    );
    if (scopes.length > 1) {
      throw new BadRequestException(
        'Apenas um escopo pode ser informado: spaceId, folderId, listId ou taskTypeId',
      );
    }

    const key = dto.key ?? slugifyKey(dto.name);
    if (!KEY_REGEX.test(key)) {
      throw new BadRequestException(
        'name nao gera um slug valido; informe `key` explicitamente',
      );
    }

    this.validateTypeRequirements(dto.type, dto.options, dto.config);
    await this.assertGroupBelongsToWorkspace(workspaceId, dto.groupId);

    const existing = await this.repository.findByKeyInScope(workspaceId, key, {
      spaceId: dto.spaceId ?? null,
      folderId: dto.folderId ?? null,
      listId: dto.listId ?? null,
      customTaskTypeId: taskTypeId,
    });
    if (existing) {
      throw new BadRequestException(
        'Já existe um campo personalizado com esse nome neste nível',
      );
    }

    try {
      const entity = await this.repository.create({
        workspaceId,
        key,
        name: dto.name,
        label: dto.label ?? dto.name,
        description: dto.description ?? null,
        type: dto.type,
        required: dto.required ?? false,
        options: (dto.options as unknown as Prisma.InputJsonValue) ?? [],
        config: (dto.config as Prisma.InputJsonValue) ?? null,
        defaultValue:
          dto.defaultValue === undefined
            ? null
            : (dto.defaultValue as Prisma.InputJsonValue),
        validation: (dto.validation as Prisma.InputJsonValue) ?? null,
        pinned: dto.pinned ?? false,
        visibleToGuests: dto.visibleToGuests ?? true,
        fillMethod: dto.fillMethod ?? 'manual',
        sortOrder: dto.position ?? dto.sortOrder ?? 0,
        createdById: userId,
        spaceId: dto.spaceId ?? null,
        folderId: dto.folderId ?? null,
        listId: dto.listId ?? null,
        customTaskTypeId: taskTypeId,
        groupId: dto.groupId ?? null,
        groupName: dto.groupName ?? null,
        groupPosition: dto.groupPosition ?? null,
        groupColor: dto.groupColor ?? null,
      });

      this.metrics.customFieldsWrittenTotal({
        fieldType: entity.type,
        workspaceId,
      });

      if (dto.listId) {
        await this.repository.addLocationLink(
          entity.id,
          'list',
          dto.listId,
          entity.groupId,
        );
      } else if (dto.folderId) {
        await this.repository.addLocationLink(
          entity.id,
          'folder',
          dto.folderId,
          entity.groupId,
        );
      } else if (dto.spaceId) {
        await this.repository.addLocationLink(
          entity.id,
          'space',
          dto.spaceId,
          entity.groupId,
        );
      }

      this.logger.log(
        `custom-field-definition.created id=${entity.id} key=${entity.key} workspace=${workspaceId}`,
      );

      return CustomFieldDefinitionResponseDto.fromEntity(entity, {
        exposeWorkspaceId: true,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Já existe um campo personalizado com esse nome neste nível',
        );
      }
      throw error;
    }
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateCustomFieldDefinitionDto,
  ): Promise<CustomFieldDefinitionResponseDto> {
    const visible = await this.repository.findVisibleById(workspaceId, id);
    if (!visible) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }
    if (visible.workspaceId === null || visible.isBuiltin) {
      throw new ForbiddenException(BUILTIN_LOCK_MESSAGE);
    }
    if (visible.workspaceId !== workspaceId) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }

    if (dto.options !== undefined || dto.config !== undefined) {
      this.validateTypeRequirements(
        visible.type,
        dto.options ?? (visible.options as unknown[] | undefined),
        dto.config ?? (visible.config as Record<string, unknown> | undefined),
      );
    }
    if (dto.groupId !== undefined && dto.groupId !== null) {
      await this.assertGroupBelongsToWorkspace(workspaceId, dto.groupId);
    }

    const labelUpdate = dto.label ?? dto.name;
    const updated = await this.repository.update(id, {
      name: dto.name,
      label: labelUpdate,
      description: dto.description,
      required: dto.required,
      options:
        dto.options === undefined
          ? undefined
          : (dto.options as unknown as Prisma.InputJsonValue),
      config:
        dto.config === undefined
          ? undefined
          : ((dto.config as Prisma.InputJsonValue) ?? null),
      defaultValue:
        dto.defaultValue === undefined
          ? undefined
          : ((dto.defaultValue as Prisma.InputJsonValue) ?? null),
      validation:
        dto.validation === undefined
          ? undefined
          : ((dto.validation as Prisma.InputJsonValue) ?? null),
      pinned: dto.pinned,
      visibleToGuests: dto.visibleToGuests,
      fillMethod: dto.fillMethod,
      sortOrder: dto.position ?? dto.sortOrder,
      groupId: dto.groupId,
      groupName: dto.groupName,
      groupPosition: dto.groupPosition,
      groupColor: dto.groupColor,
    });

    this.logger.log(
      `custom-field-definition.updated id=${updated.id} workspace=${workspaceId}`,
    );

    return CustomFieldDefinitionResponseDto.fromEntity(updated, {
      exposeWorkspaceId: true,
    });
  }

  async remove(
    workspaceId: string,
    id: string,
  ): Promise<CustomFieldDefinitionResponseDto> {
    const visible = await this.repository.findVisibleById(workspaceId, id);
    if (!visible) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }
    if (visible.workspaceId === null || visible.isBuiltin) {
      throw new ForbiddenException(BUILTIN_LOCK_MESSAGE);
    }
    if (visible.workspaceId !== workspaceId) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }

    const deleted = await this.repository.softDelete(id);
    this.logger.log(
      `custom-field-definition.soft-deleted id=${id} workspace=${workspaceId}`,
    );

    return CustomFieldDefinitionResponseDto.fromEntity(deleted, {
      exposeWorkspaceId: true,
    });
  }

  async addLocation(
    workspaceId: string,
    dto: AddCustomFieldLocationDto,
  ): Promise<CustomFieldWithLocations> {
    const visible = await this.repository.findVisibleById(
      workspaceId,
      dto.customFieldId,
    );
    if (!visible) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }
    if (visible.workspaceId === null || visible.isBuiltin) {
      throw new ForbiddenException(BUILTIN_LOCK_MESSAGE);
    }
    if (visible.workspaceId !== workspaceId) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }

    await this.repository.addLocationLink(
      dto.customFieldId,
      dto.locationType,
      dto.targetId,
      visible.groupId,
    );
    this.logger.log(
      `custom-field-location.add cf=${dto.customFieldId} type=${dto.locationType} target=${dto.targetId} action=${dto.action} workspace=${workspaceId}`,
    );

    return this.buildWithLocations(workspaceId, dto.customFieldId);
  }

  async removeLocation(
    workspaceId: string,
    customFieldId: string,
    locationType: 'list' | 'folder' | 'space',
    locationId: string,
  ): Promise<CustomFieldWithLocations> {
    const visible = await this.repository.findVisibleById(
      workspaceId,
      customFieldId,
    );
    if (!visible) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }
    if (visible.workspaceId === null || visible.isBuiltin) {
      throw new ForbiddenException(BUILTIN_LOCK_MESSAGE);
    }
    if (visible.workspaceId !== workspaceId) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }

    await this.repository.removeLocationLink(
      customFieldId,
      locationType,
      locationId,
    );
    this.logger.log(
      `custom-field-location.remove cf=${customFieldId} type=${locationType} target=${locationId} workspace=${workspaceId}`,
    );

    return this.buildWithLocations(workspaceId, customFieldId);
  }

  private async buildWithLocations(
    workspaceId: string,
    customFieldId: string,
  ): Promise<CustomFieldWithLocations> {
    const entity = await this.repository.findVisibleById(
      workspaceId,
      customFieldId,
    );
    if (!entity) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }
    const base = CustomFieldDefinitionResponseDto.fromEntity(entity, {
      exposeWorkspaceId: entity.workspaceId === workspaceId,
    });
    const links = await this.repository.findLocationLinks(customFieldId);
    return { ...base, ...links };
  }

  private async assertGroupBelongsToWorkspace(
    workspaceId: string,
    groupId: string | null | undefined,
  ): Promise<void> {
    if (!groupId) return;
    const group = await this.groupsRepository.findOne(workspaceId, groupId);
    if (!group) {
      throw new BadRequestException(
        'groupId nao pertence ao workspace ou nao existe',
      );
    }
  }

  private validateTypeRequirements(
    type: CustomFieldType,
    options: unknown,
    config: unknown,
  ): void {
    const optsArray = Array.isArray(options) ? options : [];
    const cfg =
      typeof config === 'object' && config !== null && !Array.isArray(config)
        ? (config as Record<string, unknown>)
        : null;

    if (type === CustomFieldType.LABEL && optsArray.length === 0) {
      throw new BadRequestException('LABEL exige options nao vazio');
    }
    if (type === CustomFieldType.RELATIONSHIP) {
      const taskTypeId = cfg?.taskTypeId;
      if (typeof taskTypeId !== 'string' || taskTypeId.length === 0) {
        throw new BadRequestException(
          'RELATIONSHIP exige config.taskTypeId (string)',
        );
      }
    }
    if (type === CustomFieldType.ROLLUP && cfg === null) {
      throw new BadRequestException('ROLLUP exige config');
    }
  }
}

function slugifyKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, '_$1');
}
