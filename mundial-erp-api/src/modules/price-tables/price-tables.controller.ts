import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PriceTablesService } from './price-tables.service';
import { CreatePriceTableDto } from './dto/create-price-table.dto';
import { UpdatePriceTableDto } from './dto/update-price-table.dto';
import { UpsertPriceTableItemDto } from './dto/upsert-price-table-item.dto';
import { PriceTableResponseDto, PriceTableItemResponseDto } from './dto/price-table-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Price Tables')
@ApiBearerAuth()
@Controller('price-tables')
export class PriceTablesController {
  constructor(private readonly priceTablesService: PriceTablesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar tabela de preço' })
  @ApiResponse({ status: 201, type: PriceTableResponseDto })
  create(@Body() dto: CreatePriceTableDto) {
    return this.priceTablesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar tabelas de preço' })
  findAll(@Query() pagination: PaginationDto, @Query('search') search?: string) {
    return this.priceTablesService.findAll(pagination, search);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar tabela de preço por ID (com itens)' })
  @ApiResponse({ status: 200, type: PriceTableResponseDto })
  @ApiResponse({ status: 404, description: 'Não encontrada' })
  findOne(@Param('id') id: string) {
    return this.priceTablesService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar tabela de preço' })
  @ApiResponse({ status: 200, type: PriceTableResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdatePriceTableDto) {
    return this.priceTablesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover tabela de preço (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.priceTablesService.remove(id);
  }

  // --- Items ---
  @Post(':id/items')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Adicionar/atualizar item na tabela de preço (upsert)' })
  @ApiResponse({ status: 201, type: PriceTableItemResponseDto })
  upsertItem(@Param('id') id: string, @Body() dto: UpsertPriceTableItemDto) {
    return this.priceTablesService.upsertItem(id, dto);
  }

  @Get(':id/items')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar itens da tabela de preço' })
  findItems(@Param('id') id: string, @Query() pagination: PaginationDto) {
    return this.priceTablesService.findItems(id, pagination);
  }

  @Delete(':id/items/:itemId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item da tabela de preço' })
  @ApiResponse({ status: 204 })
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.priceTablesService.removeItem(id, itemId);
  }
}
