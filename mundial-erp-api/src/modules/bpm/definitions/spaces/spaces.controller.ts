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
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpaceResponseDto } from './dto/space-response.dto';
import { SidebarSpaceDto } from './dto/sidebar-space.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { Roles } from '../../../auth/decorators';
import { WorkspaceId } from '../../../workspaces/decorators/workspace-id.decorator';

@ApiTags('BPM - Departments')
@ApiBearerAuth()
@Controller('departments')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar departamento (somente ADMIN)' })
  @ApiResponse({ status: 201, type: SpaceResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Departamento com este nome já existe',
  })
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreateSpaceDto) {
    return this.spacesService.create(workspaceId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar departamentos' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.spacesService.findAll(workspaceId, pagination);
  }

  @Get('sidebar')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Árvore de departamentos para sidebar' })
  @ApiResponse({ status: 200, type: [SidebarSpaceDto] })
  getSidebarTree(@WorkspaceId() workspaceId: string) {
    return this.spacesService.getSidebarTree(workspaceId);
  }

  @Get('by-slug/:slug')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Buscar departamento por slug (com áreas e processos diretos)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Departamento não encontrado' })
  findBySlug(@WorkspaceId() workspaceId: string, @Param('slug') slug: string) {
    return this.spacesService.findBySlug(workspaceId, slug);
  }

  @Get(':id/process-summaries')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary:
      'Resumo consolidado de todos os processos do departamento (LIST + BPM)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Departamento não encontrado' })
  getProcessSummaries(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Query('showClosed') showClosed?: string,
  ) {
    return this.spacesService.getProcessSummaries(
      workspaceId,
      id,
      showClosed === 'true',
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar departamento por ID' })
  @ApiResponse({ status: 200, type: SpaceResponseDto })
  @ApiResponse({ status: 404, description: 'Departamento não encontrado' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.spacesService.findById(workspaceId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar departamento (somente ADMIN)' })
  @ApiResponse({ status: 200, type: SpaceResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSpaceDto,
  ) {
    return this.spacesService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover departamento (soft delete, somente ADMIN)',
  })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.spacesService.remove(workspaceId, id);
  }
}
