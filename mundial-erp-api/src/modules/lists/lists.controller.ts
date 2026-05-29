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
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { UpdateListVisibilityDto } from './dto/update-list-visibility.dto';
import { AddListMemberDto } from './dto/add-list-member.dto';
import { UpdateListMemberDto } from './dto/update-list-member.dto';
import { ListResponseDto } from './dto/list-response.dto';
import { ListStatusInheritBulkDto } from './dto/status-inherit-bulk.dto';
import { CurrentUser, WorkspaceRoles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';

@ApiTags('Lists')
@ApiBearerAuth()
@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post()
  @SkipResponseTransform()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Criar list (somente ADMIN)' })
  @ApiResponse({ status: 201, type: ListResponseDto })
  @ApiResponse({ status: 409, description: 'List com este nome já existe' })
  create(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateListDto,
  ) {
    return this.listsService.create(workspaceId, user.sub, dto);
  }

  @Get()
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Listar lists por folder ou space' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query('folderId') folderId?: string,
    @Query('spaceId') spaceId?: string,
  ) {
    return this.listsService.findAllScoped(workspaceId, { folderId, spaceId });
  }

  @Get(':id/resources')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Metadata de filters/sortOptions da list' })
  getResources(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.listsService.getResources(workspaceId, id);
  }

  @Get(':id/visibility')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Visibility atual da list' })
  getVisibility(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.listsService.getVisibility(workspaceId, id);
  }

  @Put(':id/visibility')
  @SkipResponseTransform()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar visibility da list' })
  updateVisibility(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateListVisibilityDto,
  ) {
    return this.listsService.updateVisibility(workspaceId, id, dto.visibility);
  }

  @Get(':id/members')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Listar membros da list' })
  listMembers(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.listsService.listMembers(workspaceId, id);
  }

  @Post(':id/members')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Adicionar membro à list' })
  addMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddListMemberDto,
  ) {
    return this.listsService.addMember(
      workspaceId,
      id,
      dto.userId,
      dto.permission,
      user.sub,
    );
  }

  @Put(':id/members/:userId')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Atualizar permission de membro da list' })
  updateMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateListMemberDto,
  ) {
    return this.listsService.updateMember(
      workspaceId,
      id,
      userId,
      dto.permission,
      user.sub,
    );
  }

  @Delete(':id/members/:userId')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Remover membro da list' })
  removeMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listsService.removeMember(workspaceId, id, userId, user.sub);
  }

  @Get(':id/statuses')
  @SkipResponseTransform()
  @ApiOperation({
    summary: 'Listar statuses da list (vazio se inheritance != CUSTOM)',
  })
  listStatuses(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.listsService.listStatuses(workspaceId, id);
  }

  @Put(':id/status')
  @SkipResponseTransform()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({
    summary:
      'Atualizar statusInheritance + statuses da list (estilo Hoppe). Inheritance != CUSTOM soft-deleta statuses.',
  })
  replaceStatuses(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: ListStatusInheritBulkDto,
  ) {
    return this.listsService.replaceStatuses(
      workspaceId,
      id,
      dto.statusInheritance,
      dto.statuses ?? [],
    );
  }

  @Get(':id')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Buscar list por ID' })
  @ApiResponse({ status: 200, type: ListResponseDto })
  @ApiResponse({ status: 404, description: 'List não encontrada' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.listsService.findById(workspaceId, id);
  }

  @Put(':id')
  @SkipResponseTransform()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar list (somente ADMIN)' })
  @ApiResponse({ status: 200, type: ListResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateListDto,
  ) {
    return this.listsService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @SkipResponseTransform()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Remover list (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 200 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.listsService.remove(workspaceId, id);
  }
}
