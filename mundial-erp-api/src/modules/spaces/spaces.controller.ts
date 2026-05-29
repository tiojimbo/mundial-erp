import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { UpdateSpaceVisibilityDto } from './dto/update-space-visibility.dto';
import { AddSpaceMemberDto } from './dto/add-space-member.dto';
import { UpdateSpaceMemberDto } from './dto/update-space-member.dto';
import { SpaceResponseDto } from './dto/space-response.dto';
import { StatusBulkDto } from './dto/status-bulk.dto';
import { SidebarSpaceDto } from './dto/sidebar-space.dto';
import { CurrentUser, WorkspaceRoles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';

@ApiTags('Spaces')
@ApiBearerAuth()
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @SkipResponseTransform()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Criar space (somente ADMIN)' })
  @ApiResponse({ status: 201, type: SpaceResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Space com este nome já existe',
  })
  create(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSpaceDto,
  ) {
    return this.spacesService.create(workspaceId, user.sub, dto);
  }

  @Get()
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Listar spaces (array com folders e statuses)' })
  findAll(@WorkspaceId() workspaceId: string) {
    return this.spacesService.findAll(workspaceId);
  }

  @Get('shared-with-me')
  @SkipResponseTransform()
  @ApiOperation({
    summary: 'Spaces dos quais o usuário é membro mas não criador',
  })
  @ApiResponse({ status: 200, type: [SpaceResponseDto] })
  sharedWithMe(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.spacesService.findSharedWithMe(workspaceId, user.sub);
  }

  @Get('sidebar')
  @ApiOperation({ summary: 'Árvore de departamentos para sidebar' })
  @ApiResponse({ status: 200, type: [SidebarSpaceDto] })
  getSidebarTree(@WorkspaceId() workspaceId: string) {
    return this.spacesService.getSidebarTree(workspaceId);
  }

  @Get('by-slug/:slug')
  @ApiOperation({
    summary: 'Buscar space por slug (com folders e lists diretas)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Space não encontrado' })
  findBySlug(@WorkspaceId() workspaceId: string, @Param('slug') slug: string) {
    return this.spacesService.findBySlug(workspaceId, slug);
  }

  @Get(':id/process-summaries')
  @ApiOperation({
    summary: 'Resumo consolidado de todas as lists do space (LIST + BPM)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Space não encontrado' })
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

  @Get(':id/resources')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Metadata de filters/sortOptions do space' })
  getResources(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.spacesService.getResources(workspaceId, id);
  }

  @Get(':id/members')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Listar membros do space' })
  listMembers(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.spacesService.listMembers(workspaceId, id);
  }

  @Post(':id/members')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Adicionar membro ao space' })
  addMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddSpaceMemberDto,
  ) {
    return this.spacesService.addMember(
      workspaceId,
      id,
      dto.userId,
      dto.permission,
      user.sub,
    );
  }

  @Put(':id/members/:userId')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Atualizar permission de membro' })
  updateMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSpaceMemberDto,
  ) {
    return this.spacesService.updateMember(
      workspaceId,
      id,
      userId,
      dto.permission,
      user.sub,
    );
  }

  @Delete(':id/members/:userId')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Remover membro do space' })
  removeMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.spacesService.removeMember(workspaceId, id, userId, user.sub);
  }

  @Get(':id/visibility')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Visibility atual do space' })
  getVisibility(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.spacesService.getVisibility(workspaceId, id);
  }

  @Put(':id/visibility')
  @SkipResponseTransform()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar visibility do space' })
  updateVisibility(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSpaceVisibilityDto,
  ) {
    return this.spacesService.updateVisibility(workspaceId, id, dto.visibility);
  }

  @Get(':id/statuses')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Listar statuses do space (paridade Hoppe)' })
  listStatuses(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.spacesService.listStatuses(workspaceId, id);
  }

  @Put(':id/status')
  @SkipResponseTransform()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({
    summary:
      'Substituir lista completa de statuses do space (estilo Hoppe: items com id sao update, sem id sao create, ausentes viram soft delete)',
  })
  replaceStatuses(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: StatusBulkDto,
  ) {
    return this.spacesService.replaceStatuses(workspaceId, id, dto.statuses);
  }

  @Get(':id')
  @SkipResponseTransform()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Buscar space por ID' })
  @ApiResponse({ status: 200, type: SpaceResponseDto })
  @ApiResponse({ status: 404, description: 'Space não encontrado' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.spacesService.findById(workspaceId, id);
  }

  @Put(':id')
  @SkipResponseTransform()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar space (somente ADMIN)' })
  @ApiResponse({ status: 200, type: SpaceResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSpaceDto,
  ) {
    return this.spacesService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @SkipResponseTransform()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({
    summary: 'Remover space (soft delete, somente ADMIN)',
  })
  @ApiResponse({ status: 200 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.spacesService.remove(workspaceId, id);
  }
}
