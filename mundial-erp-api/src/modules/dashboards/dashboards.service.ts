import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { DashboardsRepository } from './dashboards.repository';
import { DashboardCardQueryService } from './dashboard-card-query.service';
import type {
  DataSource,
  AxisConfig,
  GlobalFilter,
} from './dashboard-card-query.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { UpdateLayoutDto } from './dto/update-layout.dto';
import { CreateFilterDto } from './dto/create-filter.dto';
import {
  DashboardResponseDto,
  DashboardCardResponseDto,
  DashboardFilterResponseDto,
} from './dto/dashboard-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

type UserContext = { userId: string; role: Role };

@Injectable()
export class DashboardsService {
  private readonly logger = new Logger(DashboardsService.name);

  constructor(
    private readonly repo: DashboardsRepository,
    private readonly queryService: DashboardCardQueryService,
  ) {}

  // ---------------------------------------------------------------------------
  // Dashboard CRUD
  // ---------------------------------------------------------------------------

  async create(
    workspaceId: string,
    dto: CreateDashboardDto,
    userId: string,
  ): Promise<DashboardResponseDto> {
    const entity = await this.repo.create(workspaceId, {
      name: dto.name,
      description: dto.description,
      isPublic: dto.isPublic ?? false,
      autoRefreshSeconds: dto.autoRefreshSeconds,
      sortOrder: dto.sortOrder ?? 0,
      owner: { connect: { id: userId } },
    });

    this.logger.log(
      `Dashboard "${dto.name}" criado (ID: ${entity.id}) por ${userId}`,
    );
    return DashboardResponseDto.fromEntity(
      entity as unknown as Record<string, unknown>,
    );
  }

  async findAll(
    workspaceId: string,
    pagination: PaginationDto,
    userId: string,
  ) {
    const { items, total } = await this.repo.findMany(workspaceId, {
      skip: pagination.skip,
      take: pagination.limit,
      ownerId: userId,
    });

    return {
      items: items.map((e) =>
        DashboardResponseDto.fromEntity(
          e as unknown as Record<string, unknown>,
        ),
      ),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async findById(
    workspaceId: string,
    id: string,
    user: UserContext,
  ): Promise<DashboardResponseDto> {
    const entity = await this.repo.findById(workspaceId, id);
    if (!entity) throw new NotFoundException('Dashboard nao encontrado');
    this.assertReadAccess(entity, user);
    return DashboardResponseDto.fromEntity(
      entity as unknown as Record<string, unknown>,
    );
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateDashboardDto,
    user: UserContext,
  ): Promise<DashboardResponseDto> {
    const entity = await this.repo.findById(workspaceId, id);
    if (!entity) throw new NotFoundException('Dashboard nao encontrado');
    this.assertWriteAccess(entity, user);

    const updated = await this.repo.update(workspaceId, id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      ...(dto.autoRefreshSeconds !== undefined && {
        autoRefreshSeconds: dto.autoRefreshSeconds,
      }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });

    return DashboardResponseDto.fromEntity(
      updated as unknown as Record<string, unknown>,
    );
  }

  async remove(
    workspaceId: string,
    id: string,
    user: UserContext,
  ): Promise<void> {
    const entity = await this.repo.findById(workspaceId, id);
    if (!entity) throw new NotFoundException('Dashboard nao encontrado');
    this.assertWriteAccess(entity, user);

    await this.repo.softDelete(workspaceId, id);
    this.logger.log(`Dashboard ${id} soft-deleted por ${user.userId}`);
  }

  // ---------------------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------------------

  async addCard(
    workspaceId: string,
    dashboardId: string,
    dto: CreateCardDto,
    user: UserContext,
  ): Promise<DashboardCardResponseDto> {
    await this.loadAndAssertWrite(workspaceId, dashboardId, user);

    const card = await this.repo.createCard({
      dashboard: { connect: { id: dashboardId } },
      type: dto.type,
      title: dto.title,
      dataSource: dto.dataSource,
      filters: dto.filters ?? undefined,
      axisConfig: dto.axisConfig ?? undefined,
      layoutX: dto.layoutX,
      layoutY: dto.layoutY,
      layoutW: dto.layoutW,
      layoutH: dto.layoutH,
      config: dto.config ?? undefined,
      sortOrder: dto.sortOrder ?? 0,
    });

    this.logger.log(
      `Card "${dto.title}" adicionado ao dashboard ${dashboardId}`,
    );
    return DashboardCardResponseDto.fromEntity(
      card as unknown as Record<string, unknown>,
    );
  }

  async updateCard(
    workspaceId: string,
    dashboardId: string,
    cardId: string,
    dto: UpdateCardDto,
    user: UserContext,
  ): Promise<DashboardCardResponseDto> {
    await this.loadAndAssertWrite(workspaceId, dashboardId, user);
    const card = await this.repo.findCardById(workspaceId, cardId);
    if (!card || card.dashboardId !== dashboardId) {
      throw new NotFoundException('Card nao encontrado neste dashboard');
    }

    const updated = await this.repo.updateCard(cardId, {
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.dataSource !== undefined && { dataSource: dto.dataSource }),
      ...(dto.filters !== undefined && { filters: dto.filters }),
      ...(dto.axisConfig !== undefined && { axisConfig: dto.axisConfig }),
      ...(dto.layoutX !== undefined && { layoutX: dto.layoutX }),
      ...(dto.layoutY !== undefined && { layoutY: dto.layoutY }),
      ...(dto.layoutW !== undefined && { layoutW: dto.layoutW }),
      ...(dto.layoutH !== undefined && { layoutH: dto.layoutH }),
      ...(dto.config !== undefined && { config: dto.config }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });

    return DashboardCardResponseDto.fromEntity(
      updated as unknown as Record<string, unknown>,
    );
  }

  async removeCard(
    workspaceId: string,
    dashboardId: string,
    cardId: string,
    user: UserContext,
  ): Promise<void> {
    await this.loadAndAssertWrite(workspaceId, dashboardId, user);
    const card = await this.repo.findCardById(workspaceId, cardId);
    if (!card || card.dashboardId !== dashboardId) {
      throw new NotFoundException('Card nao encontrado neste dashboard');
    }
    await this.repo.deleteCard(cardId);
  }

  async updateLayout(
    workspaceId: string,
    dashboardId: string,
    dto: UpdateLayoutDto,
    user: UserContext,
  ): Promise<DashboardResponseDto> {
    const dashboard = await this.loadAndAssertWrite(
      workspaceId,
      dashboardId,
      user,
    );

    const dashboardCardIds = new Set(
      (dashboard.cards ?? []).map(
        (c: Record<string, unknown>) => c.id as string,
      ),
    );
    for (const card of dto.cards) {
      if (!dashboardCardIds.has(card.cardId)) {
        throw new NotFoundException(
          `Card "${card.cardId}" nao pertence a este dashboard`,
        );
      }
    }

    await this.repo.updateLayoutBatch(dto.cards);
    const updated = await this.repo.findById(workspaceId, dashboardId);
    return DashboardResponseDto.fromEntity(
      updated as unknown as Record<string, unknown>,
    );
  }

  // ---------------------------------------------------------------------------
  // Card Data (Query Engine)
  // ---------------------------------------------------------------------------

  async getCardData(
    workspaceId: string,
    dashboardId: string,
    cardId: string,
    user: UserContext,
  ) {
    const dashboard = await this.repo.findById(workspaceId, dashboardId);
    if (!dashboard) throw new NotFoundException('Dashboard nao encontrado');
    this.assertReadAccess(dashboard, user);

    const card = await this.repo.findCardById(workspaceId, cardId);
    if (!card || card.dashboardId !== dashboardId) {
      throw new NotFoundException('Card nao encontrado neste dashboard');
    }

    const globalFilters = await this.repo.findFiltersByDashboardId(dashboardId);
    const gfMapped: GlobalFilter[] = globalFilters.map((f) => ({
      field: f.field,
      operator: f.operator,
      value: f.value,
    }));

    return this.queryService.execute(
      card.type,
      card.dataSource as DataSource,
      (card.axisConfig as AxisConfig) ?? null,
      (card.filters as Record<string, unknown>) ?? null,
      gfMapped,
    );
  }

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  async addFilter(
    workspaceId: string,
    dashboardId: string,
    dto: CreateFilterDto,
    user: UserContext,
  ): Promise<DashboardFilterResponseDto> {
    await this.loadAndAssertWrite(workspaceId, dashboardId, user);

    const filter = await this.repo.createFilter({
      dashboard: { connect: { id: dashboardId } },
      field: dto.field,
      operator: dto.operator,
      value: dto.value as Parameters<typeof this.repo.createFilter>[0]['value'],
      label: dto.label,
    });

    return DashboardFilterResponseDto.fromEntity(
      filter as unknown as Record<string, unknown>,
    );
  }

  async removeFilter(
    workspaceId: string,
    dashboardId: string,
    filterId: string,
    user: UserContext,
  ): Promise<void> {
    await this.loadAndAssertWrite(workspaceId, dashboardId, user);
    const filter = await this.repo.findFilterById(workspaceId, filterId);
    if (!filter || filter.dashboardId !== dashboardId) {
      throw new NotFoundException('Filtro nao encontrado neste dashboard');
    }
    await this.repo.deleteFilter(filterId);
  }

  // ---------------------------------------------------------------------------
  // Access control helpers
  // ---------------------------------------------------------------------------

  private assertReadAccess(
    entity: { ownerId: string; isPublic: boolean },
    user: UserContext,
  ): void {
    if (user.role === Role.ADMIN) return;
    if (entity.ownerId === user.userId) return;
    if (entity.isPublic) return;
    throw new ForbiddenException('Acesso negado a este dashboard');
  }

  private assertWriteAccess(
    entity: { ownerId: string },
    user: UserContext,
  ): void {
    if (user.role === Role.ADMIN) return;
    if (entity.ownerId === user.userId) return;
    throw new ForbiddenException(
      'Somente o owner pode modificar este dashboard',
    );
  }

  private async loadAndAssertWrite(
    workspaceId: string,
    dashboardId: string,
    user: UserContext,
  ) {
    const entity = await this.repo.findById(workspaceId, dashboardId);
    if (!entity) throw new NotFoundException('Dashboard nao encontrado');
    this.assertWriteAccess(entity, user);
    return entity;
  }
}
