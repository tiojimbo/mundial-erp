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
import { PurchaseQuotationsService } from './purchase-quotations.service';
import { CreatePurchaseQuotationDto } from './dto/create-purchase-quotation.dto';
import { UpdatePurchaseQuotationDto } from './dto/update-purchase-quotation.dto';
import { PurchaseQuotationResponseDto } from './dto/purchase-quotation-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Purchase Quotations')
@ApiBearerAuth()
@Controller('purchase-quotations')
export class PurchaseQuotationsController {
  constructor(private readonly quotationsService: PurchaseQuotationsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar solicitação de cotação' })
  @ApiResponse({ status: 201, type: PurchaseQuotationResponseDto })
  create(@Body() dto: CreatePurchaseQuotationDto) {
    return this.quotationsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar cotações (filtro por status/fornecedor)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'SENT', 'RECEIVED', 'SELECTED', 'REJECTED'],
  })
  @ApiQuery({
    name: 'supplierId',
    required: false,
    description: 'Filtrar por fornecedor',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por notas ou nome do fornecedor',
  })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('search') search?: string,
  ) {
    return this.quotationsService.findAll(pagination, {
      status,
      supplierId,
      search,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Detalhe da cotação com itens e propostas' })
  @ApiResponse({ status: 200, type: PurchaseQuotationResponseDto })
  @ApiResponse({ status: 404, description: 'Cotação não encontrada' })
  findOne(@Param('id') id: string) {
    return this.quotationsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Atualizar cotação (registrar proposta recebida)' })
  @ApiResponse({ status: 200, type: PurchaseQuotationResponseDto })
  @ApiResponse({ status: 400, description: 'Transição de status inválida' })
  @ApiResponse({ status: 404, description: 'Cotação não encontrada' })
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseQuotationDto) {
    return this.quotationsService.update(id, dto);
  }

  @Patch(':id/select')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Selecionar cotação vencedora' })
  @ApiResponse({ status: 200, type: PurchaseQuotationResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Cotação não está com status RECEIVED',
  })
  @ApiResponse({ status: 404, description: 'Cotação não encontrada' })
  select(@Param('id') id: string) {
    return this.quotationsService.select(id);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Rejeitar cotação' })
  @ApiResponse({ status: 200, type: PurchaseQuotationResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Cotação não está com status RECEIVED',
  })
  @ApiResponse({ status: 404, description: 'Cotação não encontrada' })
  reject(@Param('id') id: string) {
    return this.quotationsService.reject(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover cotação (somente DRAFT, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 400,
    description: 'Apenas cotações em DRAFT podem ser removidas',
  })
  remove(@Param('id') id: string) {
    return this.quotationsService.remove(id);
  }
}
