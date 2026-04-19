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
import { OrderModelsService } from './order-models.service';
import { CreateOrderModelDto } from './dto/create-order-model.dto';
import { UpdateOrderModelDto } from './dto/update-order-model.dto';
import { OrderModelResponseDto } from './dto/order-model-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Order Models')
@ApiBearerAuth()
@Controller('order-models')
export class OrderModelsController {
  constructor(private readonly orderModelsService: OrderModelsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar modelo de pedido (somente ADMIN)' })
  @ApiResponse({ status: 201, type: OrderModelResponseDto })
  create(@Body() dto: CreateOrderModelDto) {
    return this.orderModelsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar modelos de pedido' })
  findAll(@Query() pagination: PaginationDto) {
    return this.orderModelsService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar modelo de pedido por ID' })
  @ApiResponse({ status: 200, type: OrderModelResponseDto })
  @ApiResponse({ status: 404, description: 'Modelo de pedido não encontrado' })
  findOne(@Param('id') id: string) {
    return this.orderModelsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar modelo de pedido (somente ADMIN)' })
  @ApiResponse({ status: 200, type: OrderModelResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateOrderModelDto) {
    return this.orderModelsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover modelo de pedido (soft delete, somente ADMIN)',
  })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.orderModelsService.remove(id);
  }
}
