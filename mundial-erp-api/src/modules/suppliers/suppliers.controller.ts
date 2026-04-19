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
import { Role } from '@prisma/client';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { PurchaseHistoryResponseDto } from './dto/purchase-history-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cadastrar fornecedor' })
  @ApiResponse({ status: 201, type: SupplierResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Fornecedor com este CPF/CNPJ já existe',
  })
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(workspaceId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar fornecedores' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filtrar por nome, nome fantasia ou CPF/CNPJ',
  })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.suppliersService.findAll(workspaceId, pagination, search);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar fornecedor por ID' })
  @ApiResponse({ status: 200, type: SupplierResponseDto })
  @ApiResponse({ status: 404, description: 'Fornecedor não encontrado' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.suppliersService.findById(workspaceId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar fornecedor' })
  @ApiResponse({ status: 200, type: SupplierResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover fornecedor (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.suppliersService.remove(workspaceId, id);
  }

  @Get(':id/purchase-history')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Histórico de compras do fornecedor' })
  @ApiResponse({ status: 200, type: [PurchaseHistoryResponseDto] })
  @ApiResponse({ status: 404, description: 'Fornecedor não encontrado' })
  findPurchaseHistory(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.suppliersService.findPurchaseHistory(
      workspaceId,
      id,
      pagination,
    );
  }
}
