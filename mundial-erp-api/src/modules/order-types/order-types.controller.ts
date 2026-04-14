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
import { OrderTypesService } from './order-types.service';
import { CreateOrderTypeDto } from './dto/create-order-type.dto';
import { UpdateOrderTypeDto } from './dto/update-order-type.dto';
import { OrderTypeResponseDto } from './dto/order-type-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Order Types')
@ApiBearerAuth()
@Controller('order-types')
export class OrderTypesController {
  constructor(private readonly orderTypesService: OrderTypesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar tipo de pedido (somente ADMIN)' })
  @ApiResponse({ status: 201, type: OrderTypeResponseDto })
  create(@Body() dto: CreateOrderTypeDto) {
    return this.orderTypesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar tipos de pedido' })
  findAll(@Query() pagination: PaginationDto) {
    return this.orderTypesService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar tipo de pedido por ID' })
  @ApiResponse({ status: 200, type: OrderTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Tipo de pedido não encontrado' })
  findOne(@Param('id') id: string) {
    return this.orderTypesService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar tipo de pedido (somente ADMIN)' })
  @ApiResponse({ status: 200, type: OrderTypeResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateOrderTypeDto) {
    return this.orderTypesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover tipo de pedido (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.orderTypesService.remove(id);
  }
}
