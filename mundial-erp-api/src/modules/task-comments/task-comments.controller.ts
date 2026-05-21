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
import { ToggleReactionDto } from './dtos/toggle-reaction.dto';
import { ReactionResponseDto } from './dtos/reaction-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comments')
export class TaskCommentsController {
  constructor(private readonly service: TaskCommentsService) {}

  @Get('task/:taskId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
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
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Buscar comentário por ID' })
  @ApiResponse({ status: 200, type: CommentResponseDto })
  findOne(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<CommentResponseDto> {
    return this.service.findOne(workspaceId, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
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
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Editar comentário (autor ou Manager+)' })
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

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
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
      role: user.role as Role,
    });
  }

  @Post(':id/reactions')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
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
