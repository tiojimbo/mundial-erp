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
import { PriceTablesService } from './price-tables.service';
import { CreatePriceTableDto } from './dto/create-price-table.dto';
import { UpdatePriceTableDto } from './dto/update-price-table.dto';
import { UpsertPriceTableItemDto } from './dto/upsert-price-table-item.dto';
import {
  PriceTableResponseDto,
  PriceTableItemResponseDto,
} from './dto/price-table-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Price Tables')
@ApiBearerAuth()
@Controller('price-tables')
export class PriceTablesController {
  constructor(private readonly priceTablesService: PriceTablesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar tabela de preço' })
  @ApiResponse({ status: 201, type: PriceTableResponseDto })
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreatePriceTableDto) {
    return this.priceTablesService.create(workspaceId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar tabelas de preço' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.priceTablesService.findAll(workspaceId, pagination, search);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar tabela de preço por ID (com itens)' })
  @ApiResponse({ status: 200, type: PriceTableResponseDto })
  @ApiResponse({ status: 404, description: 'Não encontrada' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.priceTablesService.findById(workspaceId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar tabela de preço' })
  @ApiResponse({ status: 200, type: PriceTableResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePriceTableDto,
  ) {
    return this.priceTablesService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover tabela de preço (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.priceTablesService.remove(workspaceId, id);
  }

  // --- Items ---
  @Post(':id/items')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Adicionar/atualizar item na tabela de preço (upsert)',
  })
  @ApiResponse({ status: 201, type: PriceTableItemResponseDto })
  upsertItem(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpsertPriceTableItemDto,
  ) {
    return this.priceTablesService.upsertItem(workspaceId, id, dto);
  }

  @Get(':id/items')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar itens da tabela de preço' })
  findItems(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.priceTablesService.findItems(workspaceId, id, pagination);
  }

  @Delete(':id/items/:itemId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item da tabela de preço' })
  @ApiResponse({ status: 204 })
  removeItem(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.priceTablesService.removeItem(workspaceId, id, itemId);
  }
}
