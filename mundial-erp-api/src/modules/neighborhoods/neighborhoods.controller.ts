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
import { NeighborhoodsService } from './neighborhoods.service';
import { CreateNeighborhoodDto } from './dto/create-neighborhood.dto';
import { UpdateNeighborhoodDto } from './dto/update-neighborhood.dto';
import { NeighborhoodResponseDto } from './dto/neighborhood-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Neighborhoods')
@ApiBearerAuth()
@Controller('neighborhoods')
export class NeighborhoodsController {
  constructor(private readonly neighborhoodsService: NeighborhoodsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar bairro (somente ADMIN)' })
  @ApiResponse({ status: 201, type: NeighborhoodResponseDto })
  create(@Body() dto: CreateNeighborhoodDto) {
    return this.neighborhoodsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar bairros' })
  findAll(@Query() pagination: PaginationDto) {
    return this.neighborhoodsService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar bairro por ID' })
  @ApiResponse({ status: 200, type: NeighborhoodResponseDto })
  @ApiResponse({ status: 404, description: 'Bairro não encontrado' })
  findOne(@Param('id') id: string) {
    return this.neighborhoodsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar bairro (somente ADMIN)' })
  @ApiResponse({ status: 200, type: NeighborhoodResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateNeighborhoodDto) {
    return this.neighborhoodsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover bairro (somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.neighborhoodsService.remove(id);
  }
}
