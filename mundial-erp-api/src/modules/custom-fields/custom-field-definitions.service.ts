import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomFieldDefinitionsRepository } from './custom-field-definitions.repository';
import { CreateCustomFieldDefinitionDto } from './dtos/create-custom-field-definition.dto';
import { UpdateCustomFieldDefinitionDto } from './dtos/update-custom-field-definition.dto';
import { CustomFieldDefinitionResponseDto } from './dtos/custom-field-definition-response.dto';
import { GroupedCustomFieldsResponseDto } from './dtos/grouped-custom-fields-response.dto';
import { ListCustomFieldsQueryDto } from './dtos/list-custom-fields-query.dto';
import {
  CUSTOM_FIELDS_METRICS,
  type CustomFieldsMetrics,
} from './custom-fields.metrics';

const BUILTIN_LOCK_MESSAGE = 'Builtin custom field definitions are read-only';

/**
 * Servico de definicoes de custom fields (CRUD).
 *
 * Regras (PLANO §"Modelo de Dados → M1" + §"Regras de Negocio"):
 *   - workspaceId vem SEMPRE do contexto autenticado, nunca do body.
 *   - isBuiltin sempre `false` para criacoes via API; builtins vem por seed.
 *   - update/delete em builtin -> 403 com mensagem padronizada.
 *   - Cross-tenant -> 404 (nunca 403).
 *   - Soft delete preserva valores existentes (ficam orfaos).
 *   - Conflito de `(workspaceId, key)` -> 409 com codigo estavel.
 */
@Injectable()
export class CustomFieldDefinitionsService {
  private readonly logger = new Logger(CustomFieldDefinitionsService.name);

  constructor(
    private readonly repository: CustomFieldDefinitionsRepository,
    @Inject(CUSTOM_FIELDS_METRICS)
    private readonly metrics: CustomFieldsMetrics,
  ) {}

  async list(
    workspaceId: string,
    filters: ListCustomFieldsQueryDto = {},
  ): Promise<GroupedCustomFieldsResponseDto> {
    const items = await this.repository.findAllVisible(workspaceId);
    const grouped: GroupedCustomFieldsResponseDto = {
      space: [],
      folder: [],
      list: [],
      taskType: [],
    };
    const hasFilter = Boolean(
      filters.spaceId ||
        filters.folderId ||
        filters.listId ||
        filters.taskTypeId,
    );
    for (const entity of items) {
      if (hasFilter && !this.matchesScopeFilter(entity, filters)) continue;
      const dto = CustomFieldDefinitionResponseDto.fromEntity(entity, {
        exposeWorkspaceId: entity.workspaceId === workspaceId,
      });
      if (entity.listId) grouped.list.push(dto);
      else if (entity.folderId) grouped.folder.push(dto);
      else if (entity.spaceId) grouped.space.push(dto);
      else if (entity.customTaskTypeId) grouped.taskType.push(dto);
    }
    return grouped;
  }

  private matchesScopeFilter(
    entity: {
      spaceId: string | null;
      folderId: string | null;
      listId: string | null;
      customTaskTypeId: string | null;
    },
    filters: ListCustomFieldsQueryDto,
  ): boolean {
    if (filters.listId && entity.listId === filters.listId) return true;
    if (filters.folderId && entity.folderId === filters.folderId) return true;
    if (filters.spaceId && entity.spaceId === filters.spaceId) return true;
    if (
      filters.taskTypeId &&
      entity.customTaskTypeId === filters.taskTypeId
    ) {
      return true;
    }
    return false;
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
  ): Promise<CustomFieldDefinitionResponseDto> {
    const scopes = [
      dto.spaceId,
      dto.folderId,
      dto.listId,
      dto.customTaskTypeId,
    ].filter(Boolean);
    if (scopes.length > 1) {
      throw new BadRequestException(
        'Apenas um escopo pode ser informado: spaceId, folderId, listId ou customTaskTypeId',
      );
    }

    const existing = await this.repository.findByKey(workspaceId, dto.key);
    if (existing) {
      throw new ConflictException({
        message: 'Ja existe um custom field com esta key neste workspace',
        code: 'CUSTOM_FIELD_DEFINITION_KEY_CONFLICT',
      });
    }

    try {
      const entity = await this.repository.create({
        workspaceId,
        key: dto.key,
        label: dto.label,
        type: dto.type,
        required: dto.required ?? false,
        config: (dto.config as Prisma.InputJsonValue) ?? null,
        sortOrder: dto.sortOrder ?? 0,
        spaceId: dto.spaceId ?? null,
        folderId: dto.folderId ?? null,
        listId: dto.listId ?? null,
        customTaskTypeId: dto.customTaskTypeId ?? null,
      });

      this.metrics.customFieldsWrittenTotal({
        fieldType: entity.type,
        workspaceId,
      });

      this.logger.log(
        `custom-field-definition.created id=${entity.id} key=${entity.key} workspace=${workspaceId}`,
      );

      return CustomFieldDefinitionResponseDto.fromEntity(entity, {
        exposeWorkspaceId: true,
      });
    } catch (error) {
      // Race condition: outro request criou com mesma key entre o pre-check
      // e o create. Prisma P2002 com target em (workspace_id, key).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          message: 'Ja existe um custom field com esta key neste workspace',
          code: 'CUSTOM_FIELD_DEFINITION_KEY_CONFLICT',
        });
      }
      throw error;
    }
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateCustomFieldDefinitionDto,
  ): Promise<CustomFieldDefinitionResponseDto> {
    // 1. Verifica visibilidade (inclui builtins) -> distingue 404 de 403.
    //    Builtin -> 403 (mensagem clara, recurso existe e e visivel a todos).
    //    Definition de outro workspace -> 404 (nao vaza existencia).
    const visible = await this.repository.findVisibleById(workspaceId, id);
    if (!visible) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }
    if (visible.workspaceId === null || visible.isBuiltin) {
      throw new ForbiddenException(BUILTIN_LOCK_MESSAGE);
    }
    // Cross-tenant defensivo (visivel mas nao do workspace atual — nao deve
    // acontecer porque visivel inclui builtin OR own; mas por seguranca):
    if (visible.workspaceId !== workspaceId) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }

    const updated = await this.repository.update(id, {
      label: dto.label,
      required: dto.required,
      config:
        dto.config === undefined
          ? undefined
          : ((dto.config as Prisma.InputJsonValue) ?? null),
      sortOrder: dto.sortOrder,
    });

    this.logger.log(
      `custom-field-definition.updated id=${updated.id} workspace=${workspaceId}`,
    );

    return CustomFieldDefinitionResponseDto.fromEntity(updated, {
      exposeWorkspaceId: true,
    });
  }

  async remove(workspaceId: string, id: string): Promise<void> {
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

    await this.repository.softDelete(id);
    this.logger.log(
      `custom-field-definition.soft-deleted id=${id} workspace=${workspaceId}`,
    );
  }
}
