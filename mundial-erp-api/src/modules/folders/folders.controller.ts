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
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { UpdateFolderVisibilityDto } from './dto/update-folder-visibility.dto';
import { AddFolderMemberDto } from './dto/add-folder-member.dto';
import { UpdateFolderMemberDto } from './dto/update-folder-member.dto';
import { FolderResponseDto } from './dto/folder-response.dto';
import { FolderStatusInheritBulkDto } from './dto/status-inherit-bulk.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';

@ApiTags('Folders')
@ApiBearerAuth()
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar folder' })
  @ApiResponse({ status: 201, type: FolderResponseDto })
  @ApiResponse({ status: 409, description: 'Folder com este nome já existe' })
  create(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFolderDto,
  ) {
    return this.foldersService.create(workspaceId, user.sub, dto);
  }

  @Get()
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar folders de um space' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query('spaceId') spaceId: string,
  ) {
    return this.foldersService.findAllBySpace(workspaceId, spaceId);
  }

  @Get('by-slug/:slug')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Buscar folder por slug (com lists e dados do space)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Folder não encontrado' })
  findBySlug(@WorkspaceId() workspaceId: string, @Param('slug') slug: string) {
    return this.foldersService.findBySlug(workspaceId, slug);
  }

  @Get(':id/process-summaries')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Resumo consolidado de todas as lists do folder (LIST + BPM)',
  })
  @ApiResponse({ status: 200 })
  getAreaProcessSummaries(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Query('showClosed') showClosed?: string,
  ) {
    return this.foldersService.getProcessSummaries(
      workspaceId,
      id,
      showClosed === 'true',
    );
  }

  @Get(':id/resources')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Metadata de filters/sortOptions do folder' })
  getResources(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.foldersService.getResources(workspaceId, id);
  }

  @Get(':id/visibility')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Visibility atual do folder' })
  getVisibility(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.foldersService.getVisibility(workspaceId, id);
  }

  @Put(':id/visibility')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar visibility do folder' })
  updateVisibility(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFolderVisibilityDto,
  ) {
    return this.foldersService.updateVisibility(
      workspaceId,
      id,
      dto.visibility,
    );
  }

  @Get(':id/members')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar membros do folder' })
  listMembers(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.foldersService.listMembers(workspaceId, id);
  }

  @Post(':id/members')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Adicionar membro ao folder' })
  addMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: AddFolderMemberDto,
  ) {
    return this.foldersService.addMember(
      workspaceId,
      id,
      dto.userId,
      dto.permission,
    );
  }

  @Put(':id/members/:userId')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar permission de membro do folder' })
  updateMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateFolderMemberDto,
  ) {
    return this.foldersService.updateMember(
      workspaceId,
      id,
      userId,
      dto.permission,
    );
  }

  @Delete(':id/members/:userId')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Remover membro do folder' })
  removeMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.foldersService.removeMember(workspaceId, id, userId);
  }

  @Get(':id/statuses')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Listar statuses do folder (vazio se inheritance != CUSTOM)',
  })
  listStatuses(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.foldersService.listStatuses(workspaceId, id);
  }

  @Put(':id/status')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary:
      'Atualizar statusInheritance + statuses do folder (estilo Hoppe). Inheritance != CUSTOM soft-deleta statuses.',
  })
  replaceStatuses(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: FolderStatusInheritBulkDto,
  ) {
    return this.foldersService.replaceStatuses(
      workspaceId,
      id,
      dto.statusInheritance,
      dto.statuses ?? [],
    );
  }

  @Get(':id')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Buscar folder por ID' })
  @ApiResponse({ status: 200, type: FolderResponseDto })
  @ApiResponse({ status: 404, description: 'Folder não encontrado' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.foldersService.findById(workspaceId, id);
  }

  @Put(':id')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar folder' })
  @ApiResponse({ status: 200, type: FolderResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Remover folder (soft delete)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({
    status: 400,
    description: 'Não é possível excluir um folder padrão',
  })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.foldersService.remove(workspaceId, id);
  }
}
