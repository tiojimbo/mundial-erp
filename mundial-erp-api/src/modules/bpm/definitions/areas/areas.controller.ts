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
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AreaResponseDto } from './dto/area-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { Roles } from '../../../auth/decorators';

@ApiTags('BPM - Areas')
@ApiBearerAuth()
@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar área' })
  @ApiResponse({ status: 201, type: AreaResponseDto })
  @ApiResponse({ status: 409, description: 'Área com este nome já existe' })
  create(@Body() dto: CreateAreaDto) {
    return this.areasService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar áreas' })
  findAll(@Query() pagination: PaginationDto) {
    return this.areasService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Buscar área por ID' })
  @ApiResponse({ status: 200, type: AreaResponseDto })
  @ApiResponse({ status: 404, description: 'Área não encontrada' })
  findOne(@Param('id') id: string) {
    return this.areasService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar área' })
  @ApiResponse({ status: 200, type: AreaResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateAreaDto) {
    return this.areasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover área (soft delete)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: 'Não é possível excluir uma área padrão' })
  remove(@Param('id') id: string) {
    return this.areasService.remove(id);
  }
}
