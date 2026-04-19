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
import { PaymentStatus, Role } from '@prisma/client';
import { AccountsReceivableService } from './accounts-receivable.service';
import { CreateAccountReceivableDto } from './dto/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from './dto/update-account-receivable.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { AccountReceivableResponseDto } from './dto/account-receivable-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';
import {
  RequireIdempotencyKey,
  IdempotencyGuard,
} from '../../common/guards/idempotency.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';

@ApiTags('Accounts Receivable')
@ApiBearerAuth()
@Controller('accounts-receivable')
export class AccountsReceivableController {
  constructor(private readonly service: AccountsReceivableService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @RequireIdempotencyKey()
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Chave de idempotência única para esta operação',
  })
  @ApiOperation({ summary: 'Criar conta a receber' })
  @ApiResponse({ status: 201, type: AccountReceivableResponseDto })
  create(@Body() dto: CreateAccountReceivableDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Listar contas a receber (filtro por cliente, status, vencidas)',
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    description: 'Filtrar por cliente',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    description: 'Filtrar por status',
  })
  @ApiQuery({
    name: 'overdue',
    required: false,
    type: Boolean,
    description: 'Somente contas vencidas',
  })
  @ApiResponse({
    status: 200,
    type: AccountReceivableResponseDto,
    isArray: true,
  })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('clientId') clientId?: string,
    @Query('status') status?: PaymentStatus,
    @Query('overdue') overdue?: string,
  ) {
    return this.service.findAll(pagination, {
      clientId,
      status,
      overdue: overdue === 'true',
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar conta a receber por ID' })
  @ApiResponse({ status: 200, type: AccountReceivableResponseDto })
  @ApiResponse({ status: 404, description: 'Conta a receber não encontrada' })
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar conta a receber' })
  @ApiResponse({ status: 200, type: AccountReceivableResponseDto })
  @ApiResponse({ status: 404, description: 'Conta a receber não encontrada' })
  update(@Param('id') id: string, @Body() dto: UpdateAccountReceivableDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/payments')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @RequireIdempotencyKey()
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Chave de idempotência única para esta operação',
  })
  @ApiOperation({ summary: 'Registrar pagamento na conta a receber' })
  @ApiResponse({ status: 201, type: AccountReceivableResponseDto })
  @ApiResponse({ status: 400, description: 'Conta já paga ou cancelada' })
  @ApiResponse({ status: 404, description: 'Conta a receber não encontrada' })
  registerPayment(@Param('id') id: string, @Body() dto: RegisterPaymentDto) {
    return this.service.registerPayment(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover conta a receber (soft delete, somente ADMIN)',
  })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
