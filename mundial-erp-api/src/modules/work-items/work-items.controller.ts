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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { WorkItemsService } from './work-items.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { ReorderWorkItemsDto } from './dto/reorder-work-items.dto';
import { WorkItemResponseDto } from './dto/work-item-response.dto';
import { WorkItemFiltersDto } from './dto/work-item-filters.dto';
import { MyTasksResponseDto } from './dto/my-tasks-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';

@ApiTags('Work Items')
@ApiBearerAuth()
@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Criar work item' })
  @ApiResponse({ status: 201, type: WorkItemResponseDto })
  create(
    @Body() dto: CreateWorkItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workItemsService.create(dto, user.sub);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar work items com filtros' })
  findAll(@Query() filters: WorkItemFiltersDto) {
    return this.workItemsService.findAll(filters);
  }

  @Get('my-tasks')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Tarefas do usuário agrupadas por data' })
  @ApiResponse({ status: 200, type: MyTasksResponseDto })
  getMyTasks(@CurrentUser() user: JwtPayload) {
    return this.workItemsService.getMyTasks(user.sub);
  }

  @Get('grouped')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar work items agrupados por status' })
  @ApiQuery({ name: 'processId', required: true })
  @ApiQuery({ name: 'showClosed', required: false, type: Boolean })
  findGrouped(
    @Query('processId') processId: string,
    @Query('showClosed') showClosed?: boolean,
  ) {
    return this.workItemsService.findGrouped(processId, showClosed);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Buscar work item por ID' })
  @ApiResponse({ status: 200, type: WorkItemResponseDto })
  @ApiResponse({ status: 404, description: 'Work item não encontrado' })
  findOne(@Param('id') id: string) {
    return this.workItemsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Atualizar work item' })
  @ApiResponse({ status: 200, type: WorkItemResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateWorkItemDto) {
    return this.workItemsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Alterar status do work item' })
  @ApiResponse({ status: 200, type: WorkItemResponseDto })
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.workItemsService.changeStatus(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover work item (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.workItemsService.remove(id);
  }

  @Post('reorder')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reordenar work items em lote' })
  @ApiResponse({ status: 204 })
  reorder(@Body() dto: ReorderWorkItemsDto) {
    return this.workItemsService.reorder(dto);
  }
}
