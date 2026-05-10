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
import { WorkspaceId } from '../../../workspaces/decorators/workspace-id.decorator';

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
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreateAreaDto) {
    return this.areasService.create(workspaceId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar áreas' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.areasService.findAll(workspaceId, pagination);
  }

  @Get('by-slug/:slug')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Buscar área por slug (com processos e dados do departamento)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Área não encontrada' })
  findBySlug(@WorkspaceId() workspaceId: string, @Param('slug') slug: string) {
    return this.areasService.findBySlug(workspaceId, slug);
  }

  @Get(':id/process-summaries')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Resumo consolidado de todos os processos da área (LIST + BPM)',
  })
  @ApiResponse({ status: 200 })
  getAreaProcessSummaries(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Query('showClosed') showClosed?: string,
  ) {
    return this.areasService.getProcessSummaries(
      workspaceId,
      id,
      showClosed === 'true',
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Buscar área por ID' })
  @ApiResponse({ status: 200, type: AreaResponseDto })
  @ApiResponse({ status: 404, description: 'Área não encontrada' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.areasService.findById(workspaceId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar área' })
  @ApiResponse({ status: 200, type: AreaResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAreaDto,
  ) {
    return this.areasService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover área (soft delete)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 400,
    description: 'Não é possível excluir uma área padrão',
  })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.areasService.remove(workspaceId, id);
  }
}
