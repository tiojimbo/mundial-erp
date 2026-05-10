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
import { ViewsService } from './views.service';
import { CreateViewDto } from './dto/create-view.dto';
import { UpdateViewDto } from './dto/update-view.dto';
import { ViewResponseDto } from './dto/view-response.dto';
import { ListViewsQueryDto } from './dto/list-views-query.dto';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Process Views')
@ApiBearerAuth()
@Controller('process-views')
export class ViewsController {
  constructor(private readonly viewsService: ViewsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar visão de processo' })
  @ApiResponse({ status: 201, type: ViewResponseDto })
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateViewDto,
  ) {
    return this.viewsService.create(workspaceId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar visões de um processo' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() query: ListViewsQueryDto,
  ) {
    return this.viewsService.findAllByList(
      workspaceId,
      query.listId,
      query,
    );
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
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

  @Patch(':id/pin')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Fixar visão como padrão (desfixa as demais do processo)',
  })
  @ApiResponse({ status: 200, type: ViewResponseDto })
  @ApiResponse({ status: 404, description: 'Visão não encontrada' })
  pin(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.viewsService.pin(workspaceId, id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover visão (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.viewsService.remove(workspaceId, id);
  }
}
