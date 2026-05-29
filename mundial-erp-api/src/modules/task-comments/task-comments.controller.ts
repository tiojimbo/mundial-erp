import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { Throttle } from '@nestjs/throttler';
import { TaskCommentsService } from './task-comments.service';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';
import { CommentFiltersDto } from './dtos/comment-filters.dto';
import {
  CommentResponseDto,
  CommentsListResponseDto,
} from './dtos/comment-response.dto';
import { ToggleReactionDto } from './dtos/toggle-reaction.dto';
import { ReactionResponseDto } from './dtos/reaction-response.dto';
import { CurrentUser, WorkspaceRoles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comments')
export class TaskCommentsController {
  constructor(private readonly service: TaskCommentsService) {}

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Listar comentários da tarefa (paginado)' })
  @ApiResponse({ status: 200, type: CommentsListResponseDto })
  findByTask(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Query() filters: CommentFiltersDto,
  ): Promise<CommentsListResponseDto> {
    return this.service.findByTask(workspaceId, taskId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar comentário por ID' })
  @ApiResponse({ status: 200, type: CommentResponseDto })
  findOne(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<CommentResponseDto> {
    return this.service.findOne(workspaceId, id);
  }

  @Post()
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Criar comentário (com @menções)' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CommentResponseDto> {
    return this.service.create(workspaceId, dto, user.sub);
  }

  @Put(':id')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Editar comentário (autor ou Manager+)' })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CommentResponseDto> {
    return this.service.update(workspaceId, id, dto, {
      userId: user.sub,
      role: user.workspaceRole as WorkspaceMemberRole,
    });
  }

  @Delete(':id')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover comentário (autor ou Manager+)' })
  @ApiResponse({ status: 204 })
  remove(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.service.remove(workspaceId, id, {
      userId: user.sub,
      role: user.workspaceRole as WorkspaceMemberRole,
    });
  }

  @Post(':id/reactions')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Toggle de reação no comentário' })
  @ApiResponse({ status: 201, type: ReactionResponseDto })
  toggleReaction(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: ToggleReactionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ReactionResponseDto> {
    return this.service.toggleReaction(workspaceId, id, user.sub, dto.emoji);
  }
}
