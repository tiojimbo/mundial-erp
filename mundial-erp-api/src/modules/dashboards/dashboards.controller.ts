import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DashboardsService } from './dashboards.service';
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
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Dashboards')
@ApiBearerAuth()
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  // ---------------------------------------------------------------------------
  // Dashboard CRUD
  // ---------------------------------------------------------------------------

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Criar dashboard' })
  @ApiResponse({ status: 201, type: DashboardResponseDto })
  create(@Body() dto: CreateDashboardDto, @CurrentUser('sub') userId: string) {
    return this.dashboardsService.create(dto, userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar dashboards do usuario + publicos' })
  @ApiResponse({ status: 200, type: DashboardResponseDto, isArray: true })
  findAll(@Query() pagination: PaginationDto, @CurrentUser('sub') userId: string) {
    return this.dashboardsService.findAll(pagination, userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Dashboard com cards e filtros' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  @ApiResponse({ status: 404, description: 'Dashboard nao encontrado' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.dashboardsService.findById(id, { userId: user.sub, role: user.role as Role });
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar dashboard (nome, visibilidade)' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  @ApiResponse({ status: 404, description: 'Dashboard nao encontrado' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDashboardDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardsService.update(id, dto, { userId: user.sub, role: user.role as Role });
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete dashboard' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Dashboard nao encontrado' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.dashboardsService.remove(id, { userId: user.sub, role: user.role as Role });
  }

  // ---------------------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------------------

  @Post(':id/cards')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Adicionar card ao dashboard' })
  @ApiResponse({ status: 201, type: DashboardCardResponseDto })
  addCard(
    @Param('id') dashboardId: string,
    @Body() dto: CreateCardDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardsService.addCard(dashboardId, dto, { userId: user.sub, role: user.role as Role });
  }

  @Patch(':id/cards/:cardId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Atualizar card (tipo, data source, layout)' })
  @ApiResponse({ status: 200, type: DashboardCardResponseDto })
  @ApiResponse({ status: 404, description: 'Card nao encontrado' })
  updateCard(
    @Param('id') dashboardId: string,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardsService.updateCard(dashboardId, cardId, dto, { userId: user.sub, role: user.role as Role });
  }

  @Delete(':id/cards/:cardId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover card' })
  @ApiResponse({ status: 204 })
  removeCard(
    @Param('id') dashboardId: string,
    @Param('cardId') cardId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardsService.removeCard(dashboardId, cardId, { userId: user.sub, role: user.role as Role });
  }

  @Patch(':id/layout')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Atualizar layout de todos os cards (batch posicoes x,y,w,h)' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  updateLayout(
    @Param('id') dashboardId: string,
    @Body() dto: UpdateLayoutDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardsService.updateLayout(dashboardId, dto, { userId: user.sub, role: user.role as Role });
  }

  // ---------------------------------------------------------------------------
  // Card Data (Query Engine)
  // ---------------------------------------------------------------------------

  @Get(':id/cards/:cardId/data')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Executar query do card — retorna dados renderizaveis' })
  @ApiResponse({ status: 200, description: 'Dados no formato do tipo de grafico' })
  @ApiResponse({ status: 404, description: 'Dashboard ou card nao encontrado' })
  getCardData(
    @Param('id') dashboardId: string,
    @Param('cardId') cardId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardsService.getCardData(dashboardId, cardId, { userId: user.sub, role: user.role as Role });
  }

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  @Post(':id/filters')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Adicionar filtro global ao dashboard' })
  @ApiResponse({ status: 201, type: DashboardFilterResponseDto })
  addFilter(
    @Param('id') dashboardId: string,
    @Body() dto: CreateFilterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardsService.addFilter(dashboardId, dto, { userId: user.sub, role: user.role as Role });
  }

  @Delete(':id/filters/:filterId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover filtro global' })
  @ApiResponse({ status: 204 })
  removeFilter(
    @Param('id') dashboardId: string,
    @Param('filterId') filterId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardsService.removeFilter(dashboardId, filterId, { userId: user.sub, role: user.role as Role });
  }
}
