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
import { ViewsService } from './views.service';
import { CreateViewDto } from './dto/create-view.dto';
import { UpdateViewDto } from './dto/update-view.dto';
import { ViewResponseDto } from './dto/view-response.dto';
import { ListViewsQueryDto } from './dto/list-views-query.dto';
import { WorkspaceRoles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Views')
@ApiBearerAuth()
@Controller('views')
export class ViewsController {
  constructor(private readonly viewsService: ViewsService) {}

  @Post()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Criar visão' })
  @ApiResponse({ status: 201, type: ViewResponseDto })
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreateViewDto) {
    return this.viewsService.create(workspaceId, dto);
  }

  @Get()
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({
    summary: 'Listar visões por escopo (?spaceId | ?folderId | ?listId)',
  })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() query: ListViewsQueryDto,
  ) {
    return this.viewsService.findManyByScope(workspaceId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar visão por ID' })
  @ApiResponse({ status: 200, type: ViewResponseDto })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.viewsService.findOne(workspaceId, id);
  }

  @Put(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar visão (nome/config)' })
  @ApiResponse({ status: 200, type: ViewResponseDto })
  @ApiResponse({ status: 404, description: 'Visão não encontrada' })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateViewDto,
  ) {
    return this.viewsService.update(workspaceId, id, dto);
  }

  @Put(':id/pin')
  @Patch(':id/pin')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({
    summary: 'Fixar visão como padrão (desfixa as demais da lista)',
  })
  @ApiResponse({ status: 200, type: ViewResponseDto })
  @ApiResponse({ status: 404, description: 'Visão não encontrada' })
  pin(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.viewsService.pin(workspaceId, id);
  }

  @Delete(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover visão (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.viewsService.remove(workspaceId, id);
  }
}
