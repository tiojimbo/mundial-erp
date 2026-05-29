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
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import {
  WorkspaceResponseDto,
  WorkspaceSeatsResponseDto,
} from './dto/workspace-response.dto';
import {
  SidebarOrderDto,
  SidebarOrderResponseDto,
} from './dto/sidebar-order.dto';
import { MyPermissionResponseDto } from './dto/my-permission-response.dto';
import {
  ChannelOrganizationResponseDto,
  UpdateChannelOrganizationDto,
} from './dto/channel-organization.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CurrentUser } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { AuthService } from '../auth/auth.service';
import { SkipWorkspaceGuard } from './decorators/skip-workspace-guard.decorator';

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @SkipWorkspaceGuard()
  @ApiOperation({
    summary: 'Criar workspace (criador vira OWNER em transacao)',
  })
  @ApiResponse({ status: 201, type: WorkspaceResponseDto })
  @ApiResponse({ status: 409, description: 'Slug ja em uso' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(userId, dto);
  }

  @Get()
  @SkipWorkspaceGuard()
  @ApiOperation({ summary: 'Listar workspaces do usuario autenticado' })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.workspacesService.findAllForUser(userId, pagination, search);
  }

  // SkipWorkspaceGuard: findById já checa membership; permite ver workspace
  // não-selecionado (user com 2 workspaces).
  @Get(':id')
  @SkipWorkspaceGuard()
  @ApiOperation({ summary: 'Detalhes do workspace (membro)' })
  @ApiResponse({ status: 200, type: WorkspaceResponseDto })
  @ApiResponse({ status: 404, description: 'Workspace nao encontrado' })
  findOne(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.workspacesService.findById(id, userId);
  }

  @Put(':id')
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar workspace (owner ou admin)' })
  @ApiResponse({ status: 200, type: WorkspaceResponseDto })
  @ApiResponse({ status: 403, description: 'Sem permissao' })
  update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete do workspace (owner only)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Apenas owner pode remover' })
  remove(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.workspacesService.remove(id, userId);
  }

  @Post(':id/select')
  @SkipWorkspaceGuard()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Selecionar workspace ativo — emite novos tokens com workspaceId no payload',
  })
  @ApiResponse({ status: 200 })
  async select(
    @Param('id') workspaceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    // Defesa em profundidade (ADR-002 #3): service revalida na $transaction.
    await this.workspacesService.assertMembership(workspaceId, user.sub);
    return this.authService.selectWorkspace(user.sub, workspaceId);
  }

  @Get(':id/my-permission')
  @SkipWorkspaceGuard()
  @ApiOperation({
    summary: 'Permissao do usuario logado neste workspace + flags derivadas',
  })
  @ApiResponse({ status: 200, type: MyPermissionResponseDto })
  @ApiResponse({ status: 403, description: 'Usuario nao e membro' })
  getMyPermission(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.workspacesService.getMyPermission(id, userId);
  }

  @Get(':id/seats')
  @ApiOperation({
    summary: 'Resumo de seats do workspace (billing — mock por enquanto)',
  })
  @ApiResponse({ status: 200, type: WorkspaceSeatsResponseDto })
  getSeats(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.workspacesService.getSeats(id, userId);
  }

  @Get(':id/sidebar-order')
  @ApiOperation({
    summary: 'Ordem do sidebar do membro logado neste workspace',
  })
  @ApiResponse({ status: 200, type: SidebarOrderResponseDto })
  @ApiResponse({ status: 404, description: 'Usuario nao e membro' })
  getSidebarOrder(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.workspacesService.getSidebarOrder(id, userId);
  }

  @Put(':id/sidebar-order')
  @ApiOperation({
    summary: 'Atualiza ordem do sidebar (merge parcial por bucket)',
  })
  @ApiResponse({ status: 200, type: SidebarOrderResponseDto })
  @ApiResponse({ status: 404, description: 'Usuario nao e membro' })
  updateSidebarOrder(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SidebarOrderDto,
  ) {
    return this.workspacesService.updateSidebarOrder(id, userId, dto);
  }

  @Get(':id/channel-organization')
  @SkipWorkspaceGuard()
  @ApiOperation({
    summary:
      'Organizacao de canais do usuario neste workspace (retorna o JSON puro ou null)',
  })
  @ApiResponse({ status: 200 })
  getChannelOrganization(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.workspacesService.getChannelOrganization(id, userId);
  }

  @Put(':id/channel-organization')
  @SkipWorkspaceGuard()
  @ApiOperation({
    summary:
      'Substitui (upsert) a organizacao de canais do usuario neste workspace',
  })
  @ApiResponse({ status: 200, type: ChannelOrganizationResponseDto })
  updateChannelOrganization(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateChannelOrganizationDto,
  ) {
    return this.workspacesService.updateChannelOrganization(id, userId, dto);
  }
}
