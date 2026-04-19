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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InvoiceDirection, Role } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import {
  RequireIdempotencyKey,
  IdempotencyGuard,
} from '../../common/guards/idempotency.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';

@ApiTags('Invoices (NF-e)')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @RequireIdempotencyKey()
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Emitir nota fiscal (NF-e)' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Chave de idempotência única para emissão',
  })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(workspaceId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Listar notas fiscais (filtro direção/cliente/empresa/pedido)',
  })
  @ApiQuery({ name: 'direction', required: false, enum: InvoiceDirection })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiResponse({ status: 200, type: InvoiceResponseDto, isArray: true })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() pagination: PaginationDto,
    @Query('direction') direction?: string,
    @Query('clientId') clientId?: string,
    @Query('companyId') companyId?: string,
    @Query('orderId') orderId?: string,
  ) {
    return this.invoicesService.findAll(workspaceId, pagination, {
      direction,
      clientId,
      companyId,
      orderId,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar nota fiscal por ID' })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Nota fiscal não encontrada' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.invoicesService.findById(workspaceId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar nota fiscal' })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Nota fiscal não encontrada' })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(workspaceId, id, dto);
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cancelar nota fiscal' })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Nota fiscal não encontrada' })
  @ApiResponse({ status: 409, description: 'Nota fiscal já cancelada' })
  cancel(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.invoicesService.cancel(workspaceId, id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover nota fiscal (soft delete)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Nota fiscal não encontrada' })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.invoicesService.remove(workspaceId, id);
  }
}
