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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SeparationOrderStatus, WorkspaceMemberRole } from '@prisma/client';
import { SeparationOrdersService } from './separation-orders.service';
import { CreateSeparationOrderDto } from './dto/create-separation-order.dto';
import { UpdateSeparationOrderDto } from './dto/update-separation-order.dto';
import { SeparationOrderResponseDto } from './dto/separation-order-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { WorkspaceRoles } from '../auth/decorators';

@ApiTags('Separation Orders')
@ApiBearerAuth()
@Controller('separation-orders')
export class SeparationOrdersController {
  constructor(private readonly service: SeparationOrdersService) {}

  // POST /separation-orders
  @Post()
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Criar ordem de separacao' })
  @ApiResponse({ status: 201, type: SeparationOrderResponseDto })
  create(@Body() dto: CreateSeparationOrderDto) {
    return this.service.create(dto);
  }

  // GET /separation-orders
  @Get()
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({
    summary: 'Listar ordens de separacao (filtro por orderId, status, search)',
  })
  @ApiQuery({
    name: 'orderId',
    required: false,
    description: 'Filtrar por pedido',
  })
  @ApiQuery({ name: 'status', required: false, enum: SeparationOrderStatus })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por codigo',
  })
  @ApiResponse({ status: 200, type: SeparationOrderResponseDto, isArray: true })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('orderId') orderId?: string,
    @Query('status') status?: SeparationOrderStatus,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(pagination, { orderId, status, search });
  }

  // GET /separation-orders/:id
  @Get(':id')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Detalhe da ordem de separacao' })
  @ApiResponse({ status: 200, type: SeparationOrderResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Ordem de separacao nao encontrada',
  })
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  // PATCH /separation-orders/:id
  @Patch(':id')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Atualizar ordem de separacao' })
  @ApiResponse({ status: 200, type: SeparationOrderResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Ordem de separacao nao encontrada',
  })
  update(@Param('id') id: string, @Body() dto: UpdateSeparationOrderDto) {
    return this.service.update(id, dto);
  }

  // DELETE /separation-orders/:id
  @Delete(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover ordem de separacao (soft delete)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 404,
    description: 'Ordem de separacao nao encontrada',
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // PATCH /separation-orders/:id/start
  @Patch(':id/start')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Iniciar separacao (PENDING -> IN_PROGRESS)' })
  @ApiResponse({ status: 200, type: SeparationOrderResponseDto })
  @ApiResponse({ status: 400, description: 'Status invalido para inicio' })
  start(@Param('id') id: string) {
    return this.service.start(id);
  }

  // PATCH /separation-orders/:id/items/:itemId/separate
  @Patch(':id/items/:itemId/separate')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Marcar item como separado' })
  @ApiResponse({ status: 200, type: SeparationOrderResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Item ja separado ou status invalido',
  })
  separateItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.separateItem(id, itemId);
  }

  // PATCH /separation-orders/:id/items/:itemId/check
  @Patch(':id/items/:itemId/check')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Marcar item como conferido' })
  @ApiResponse({ status: 200, type: SeparationOrderResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Item ja conferido ou status invalido',
  })
  checkItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.checkItem(id, itemId);
  }
}
