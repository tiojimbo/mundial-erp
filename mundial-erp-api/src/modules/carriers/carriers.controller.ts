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
import { CarriersService } from './carriers.service';
import { CreateCarrierDto } from './dto/create-carrier.dto';
import { UpdateCarrierDto } from './dto/update-carrier.dto';
import { CarrierResponseDto } from './dto/carrier-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Carriers')
@ApiBearerAuth()
@Controller('carriers')
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar transportadora (somente ADMIN)' })
  @ApiResponse({ status: 201, type: CarrierResponseDto })
  create(@Body() dto: CreateCarrierDto) {
    return this.carriersService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar transportadoras' })
  findAll(@Query() pagination: PaginationDto) {
    return this.carriersService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar transportadora por ID' })
  @ApiResponse({ status: 200, type: CarrierResponseDto })
  @ApiResponse({ status: 404, description: 'Transportadora não encontrada' })
  findOne(@Param('id') id: string) {
    return this.carriersService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar transportadora (somente ADMIN)' })
  @ApiResponse({ status: 200, type: CarrierResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateCarrierDto) {
    return this.carriersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover transportadora (soft delete, somente ADMIN)',
  })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.carriersService.remove(id);
  }
}
