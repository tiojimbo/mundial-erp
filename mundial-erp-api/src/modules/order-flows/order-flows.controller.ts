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
import { OrderFlowsService } from './order-flows.service';
import { CreateOrderFlowDto } from './dto/create-order-flow.dto';
import { UpdateOrderFlowDto } from './dto/update-order-flow.dto';
import { OrderFlowResponseDto } from './dto/order-flow-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Order Flows')
@ApiBearerAuth()
@Controller('order-flows')
export class OrderFlowsController {
  constructor(private readonly orderFlowsService: OrderFlowsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar fluxo de pedido (somente ADMIN)' })
  @ApiResponse({ status: 201, type: OrderFlowResponseDto })
  create(@Body() dto: CreateOrderFlowDto) {
    return this.orderFlowsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar fluxos de pedido' })
  findAll(@Query() pagination: PaginationDto) {
    return this.orderFlowsService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar fluxo de pedido por ID' })
  @ApiResponse({ status: 200, type: OrderFlowResponseDto })
  @ApiResponse({ status: 404, description: 'Fluxo de pedido não encontrado' })
  findOne(@Param('id') id: string) {
    return this.orderFlowsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar fluxo de pedido (somente ADMIN)' })
  @ApiResponse({ status: 200, type: OrderFlowResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateOrderFlowDto) {
    return this.orderFlowsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover fluxo de pedido (soft delete, somente ADMIN)',
  })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.orderFlowsService.remove(id);
  }
}
