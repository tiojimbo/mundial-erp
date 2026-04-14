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
import { SectorsService } from './sectors.service';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { SectorResponseDto } from './dto/sector-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { Roles } from '../../../auth/decorators';

@ApiTags('BPM - Sectors')
@ApiBearerAuth()
@Controller('sectors')
export class SectorsController {
  constructor(private readonly sectorsService: SectorsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar setor (somente ADMIN)' })
  @ApiResponse({ status: 201, type: SectorResponseDto })
  @ApiResponse({ status: 409, description: 'Setor com este nome já existe' })
  create(@Body() dto: CreateSectorDto) {
    return this.sectorsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar setores' })
  findAll(@Query() pagination: PaginationDto) {
    return this.sectorsService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar setor por ID' })
  @ApiResponse({ status: 200, type: SectorResponseDto })
  @ApiResponse({ status: 404, description: 'Setor não encontrado' })
  findOne(@Param('id') id: string) {
    return this.sectorsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar setor (somente ADMIN)' })
  @ApiResponse({ status: 200, type: SectorResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateSectorDto) {
    return this.sectorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover setor (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.sectorsService.remove(id);
  }
}
