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
import { WorkspaceMemberRole } from '@prisma/client';
import { UnitMeasuresService } from './unit-measures.service';
import { CreateUnitMeasureDto } from './dto/create-unit-measure.dto';
import { UpdateUnitMeasureDto } from './dto/update-unit-measure.dto';
import { UnitMeasureResponseDto } from './dto/unit-measure-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { WorkspaceRoles } from '../auth/decorators';

@ApiTags('Unit Measures')
@ApiBearerAuth()
@Controller('unit-measures')
export class UnitMeasuresController {
  constructor(private readonly unitMeasuresService: UnitMeasuresService) {}

  @Post()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Criar unidade de medida' })
  @ApiResponse({ status: 201, type: UnitMeasureResponseDto })
  @ApiResponse({ status: 409, description: 'Unidade já cadastrada' })
  create(@Body() dto: CreateUnitMeasureDto) {
    return this.unitMeasuresService.create(dto);
  }

  @Get()
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Listar unidades de medida' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.unitMeasuresService.findAll(pagination, search);
  }

  @Get(':id')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Buscar unidade de medida por ID' })
  @ApiResponse({ status: 200, type: UnitMeasureResponseDto })
  @ApiResponse({ status: 404, description: 'Não encontrada' })
  findOne(@Param('id') id: string) {
    return this.unitMeasuresService.findById(id);
  }

  @Patch(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar unidade de medida' })
  @ApiResponse({ status: 200, type: UnitMeasureResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateUnitMeasureDto) {
    return this.unitMeasuresService.update(id, dto);
  }

  @Delete(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover unidade de medida (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.unitMeasuresService.remove(id);
  }
}
