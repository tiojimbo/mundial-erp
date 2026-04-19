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
import { AccountsPayableService } from './accounts-payable.service';
import { CreateAccountPayableDto } from './dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from './dto/update-account-payable.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { AccountPayableResponseDto } from './dto/account-payable-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';
import {
  RequireIdempotencyKey,
  IdempotencyGuard,
} from '../../common/guards/idempotency.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';

@ApiTags('Accounts Payable')
@ApiBearerAuth()
@Controller('accounts-payable')
export class AccountsPayableController {
  constructor(
    private readonly accountsPayableService: AccountsPayableService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @RequireIdempotencyKey()
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar conta a pagar' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 201, type: AccountPayableResponseDto })
  create(@Body() dto: CreateAccountPayableDto) {
    return this.accountsPayableService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar contas a pagar' })
  @ApiQuery({
    name: 'supplierId',
    required: false,
    description: 'Filtrar por fornecedor',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    description: 'Filtrar por status',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filtrar por categoria financeira',
  })
  @ApiQuery({
    name: 'overdue',
    required: false,
    type: Boolean,
    description: 'Somente vencidas (dueDate < hoje e PENDING/PARTIAL)',
  })
  @ApiResponse({ status: 200, type: AccountPayableResponseDto, isArray: true })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: PaymentStatus,
    @Query('categoryId') categoryId?: string,
    @Query('overdue') overdue?: string,
  ) {
    return this.accountsPayableService.findAll(pagination, {
      supplierId,
      status,
      categoryId,
      overdue: overdue === 'true',
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Detalhe da conta a pagar' })
  @ApiResponse({ status: 200, type: AccountPayableResponseDto })
  @ApiResponse({ status: 404, description: 'Conta a pagar nao encontrada' })
  findOne(@Param('id') id: string) {
    return this.accountsPayableService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar conta a pagar' })
  @ApiResponse({ status: 200, type: AccountPayableResponseDto })
  @ApiResponse({ status: 404, description: 'Conta a pagar nao encontrada' })
  update(@Param('id') id: string, @Body() dto: UpdateAccountPayableDto) {
    return this.accountsPayableService.update(id, dto);
  }

  @Post(':id/payments')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @RequireIdempotencyKey()
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Registrar pagamento parcial ou total' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 200, type: AccountPayableResponseDto })
  @ApiResponse({ status: 404, description: 'Conta a pagar nao encontrada' })
  registerPayment(@Param('id') id: string, @Body() dto: RegisterPaymentDto) {
    return this.accountsPayableService.registerPayment(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover conta a pagar (soft delete)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Conta a pagar nao encontrada' })
  remove(@Param('id') id: string) {
    return this.accountsPayableService.remove(id);
  }
}
