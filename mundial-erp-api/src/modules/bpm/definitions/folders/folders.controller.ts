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
import { FolderResponseDto } from './dto/folder-response.dto';
import { CurrentUser, Roles } from '../../../auth/decorators';
import type { JwtPayload } from '../../../auth/decorators';
import { WorkspaceId } from '../../../workspaces/decorators/workspace-id.decorator';
import { SkipResponseTransform } from '../../../../common/decorators/skip-response-transform.decorator';

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
