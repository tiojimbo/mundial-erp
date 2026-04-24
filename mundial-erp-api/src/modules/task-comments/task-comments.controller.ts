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
import { Throttle } from '@nestjs/throttler';
import { TaskCommentsService } from './task-comments.service';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';
import { CommentFiltersDto } from './dtos/comment-filters.dto';
import {
  CommentResponseDto,
  CommentsListResponseDto,
} from './dtos/comment-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Task Comments')
@ApiBearerAuth()
@Controller()
export class TaskCommentsController {
  constructor(private readonly service: TaskCommentsService) {}

  @Get('tasks/:taskId/comments')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar comentarios (paginado)' })
  @ApiResponse({ status: 200, type: CommentsListResponseDto })
  findByTask(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Query() filters: CommentFiltersDto,
  ): Promise<CommentsListResponseDto> {
    return this.service.findByTask(workspaceId, taskId, filters);
  }

  @Post('tasks/:taskId/comments')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Criar comentario (com @mencoes)' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  create(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CommentResponseDto> {
    return this.service.create(workspaceId, taskId, dto, user.sub);
  }

  @Patch('task-comments/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Editar comentario (autor ou Manager+)' })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CommentResponseDto> {
    return this.service.update(workspaceId, id, dto, {
      userId: user.sub,
      role: user.role as Role,
    });
  }

  @Delete('task-comments/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover comentario (autor ou Manager+)' })
  @ApiResponse({ status: 204 })
  remove(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.service.remove(workspaceId, id, {
      userId: user.sub,
      role: user.role as Role,
    });
  }
}
