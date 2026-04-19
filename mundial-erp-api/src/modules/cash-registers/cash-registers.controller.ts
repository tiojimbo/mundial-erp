import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { CashRegistersService } from './cash-registers.service';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { CashRegisterResponseDto } from './dto/cash-register-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Cash Registers')
@ApiBearerAuth()
@Controller('cash-registers')
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  @Post('open')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Abrir caixa' })
  @ApiResponse({ status: 201, type: CashRegisterResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Já existe um caixa aberto para esta empresa',
  })
  open(
    @WorkspaceId() workspaceId: string,
    @Body() dto: OpenCashRegisterDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.cashRegistersService.open(workspaceId, dto, userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar caixas' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'isOpen', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: CashRegisterResponseDto, isArray: true })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() pagination: PaginationDto,
    @Query('companyId') companyId?: string,
    @Query('isOpen') isOpen?: string,
  ) {
    return this.cashRegistersService.findAll(workspaceId, pagination, {
      companyId,
      isOpen: isOpen === undefined ? undefined : isOpen === 'true',
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar caixa por ID' })
  @ApiResponse({ status: 200, type: CashRegisterResponseDto })
  @ApiResponse({ status: 404, description: 'Caixa não encontrado' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.cashRegistersService.findById(workspaceId, id);
  }

  @Post(':id/close')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Fechar caixa' })
  @ApiResponse({ status: 201, type: CashRegisterResponseDto })
  @ApiResponse({ status: 404, description: 'Caixa não encontrado' })
  @ApiResponse({ status: 409, description: 'Caixa já está fechado' })
  close(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: CloseCashRegisterDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.cashRegistersService.close(workspaceId, id, dto, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover caixa (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.cashRegistersService.remove(workspaceId, id);
  }
}
