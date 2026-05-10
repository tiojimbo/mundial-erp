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
import { Role } from '@prisma/client';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { UpdateSpaceVisibilityDto } from './dto/update-space-visibility.dto';
import { AddSpaceMemberDto } from './dto/add-space-member.dto';
import { UpdateSpaceMemberDto } from './dto/update-space-member.dto';
import { SpaceResponseDto } from './dto/space-response.dto';
import { SidebarSpaceDto } from './dto/sidebar-space.dto';
import { CurrentUser, Roles } from '../../../auth/decorators';
import type { JwtPayload } from '../../../auth/decorators';
import { WorkspaceId } from '../../../workspaces/decorators/workspace-id.decorator';
import { SkipResponseTransform } from '../../../../common/decorators/skip-response-transform.decorator';

@ApiTags('Spaces')
@ApiBearerAuth()
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @SkipResponseTransform()
  @Roles(Role.ADMIN)
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
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar spaces (array com folders e statuses)' })
  findAll(@WorkspaceId() workspaceId: string) {
    return this.spacesService.findAll(workspaceId);
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
    summary: 'Buscar space por slug (com folders e lists diretas)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Space não encontrado' })
  findBySlug(@WorkspaceId() workspaceId: string, @Param('slug') slug: string) {
    return this.spacesService.findBySlug(workspaceId, slug);
  }

  @Get(':id/process-summaries')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary:
      'Resumo consolidado de todas as lists do space (LIST + BPM)',
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
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Metadata de filters/sortOptions do space' })
  getResources(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.spacesService.getResources(workspaceId, id);
  }

  @Get(':id/members')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar membros do space' })
  listMembers(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.spacesService.listMembers(workspaceId, id);
  }

  @Post(':id/members')
  @SkipResponseTransform()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Adicionar membro ao space' })
  addMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: AddSpaceMemberDto,
  ) {
    return this.spacesService.addMember(
      workspaceId,
      id,
      dto.userId,
      dto.permission,
    );
  }

  @Put(':id/members/:userId')
  @SkipResponseTransform()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar permission de membro' })
  updateMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateSpaceMemberDto,
  ) {
    return this.spacesService.updateMember(
      workspaceId,
      id,
      userId,
      dto.permission,
    );
  }

  @Delete(':id/members/:userId')
  @SkipResponseTransform()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remover membro do space' })
  removeMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.spacesService.removeMember(workspaceId, id, userId);
  }

  @Get(':id/visibility')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Visibility atual do space' })
  getVisibility(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.spacesService.getVisibility(workspaceId, id);
  }

  @Put(':id/visibility')
  @SkipResponseTransform()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar visibility do space' })
  updateVisibility(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSpaceVisibilityDto,
  ) {
    return this.spacesService.updateVisibility(workspaceId, id, dto.visibility);
  }

  @Get(':id')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar space por ID' })
  @ApiResponse({ status: 200, type: SpaceResponseDto })
  @ApiResponse({ status: 404, description: 'Space não encontrado' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.spacesService.findById(workspaceId, id);
  }

  @Put(':id')
  @SkipResponseTransform()
  @Roles(Role.ADMIN)
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
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Remover space (soft delete, somente ADMIN)',
  })
  @ApiResponse({ status: 200 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.spacesService.remove(workspaceId, id);
  }
}
