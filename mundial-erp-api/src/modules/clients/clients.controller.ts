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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientResponseDto } from './dto/client-response.dto';
import { ClientOrderResponseDto } from './dto/client-order-response.dto';
import { ClientFinancialResponseDto } from './dto/client-financial-response.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar cliente' })
  @ApiResponse({ status: 201, type: ClientResponseDto })
  @ApiResponse({ status: 400, description: 'CPF/CNPJ inválido' })
  @ApiResponse({
    status: 409,
    description: 'Cliente com este CPF/CNPJ já existe',
  })
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreateClientDto) {
    return this.clientsService.create(workspaceId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar clientes' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() query: ListClientsQueryDto,
  ) {
    return this.clientsService.findAll(workspaceId, query, query.search);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.clientsService.findById(workspaceId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar cliente' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 400, description: 'CPF/CNPJ inválido' })
  @ApiResponse({
    status: 409,
    description: 'Cliente com este CPF/CNPJ já existe',
  })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover cliente (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.clientsService.remove(workspaceId, id);
  }

  @Get(':id/orders')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar pedidos do cliente' })
  @ApiResponse({ status: 200, type: ClientOrderResponseDto, isArray: true })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  findOrders(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.clientsService.findOrders(workspaceId, id, pagination);
  }

  @Get(':id/financials')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Resumo financeiro do cliente (AR total, pago, pendente, vencido)',
  })
  @ApiResponse({ status: 200, type: ClientFinancialResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  getFinancials(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.clientsService.getFinancials(workspaceId, id);
  }
}
