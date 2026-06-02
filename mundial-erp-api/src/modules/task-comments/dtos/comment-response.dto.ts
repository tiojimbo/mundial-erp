import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export interface CommentUserShape {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

export interface CommentReactionShape {
  emoji: string;
  userId: string;
  createdAt: Date;
}

export interface CommentShape {
  id: string;
  workItemId: string;
  authorId: string;
  content: string;
  contentBlocks: Prisma.JsonValue | null;
  parentId: string | null;
  mentions: Prisma.JsonValue | null;
  assigneeId: string | null;
  assignedById: string | null;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  author?: CommentUserShape | null;
  assignee?: CommentUserShape | null;
  assignedBy?: CommentUserShape | null;
  reactions?: CommentReactionShape[];
}

export class CommentUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  avatar?: string | null;
}

export class CommentReactionDto {
  @ApiProperty()
  emoji!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class CommentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workItemId!: string;

  @ApiProperty()
  authorId!: string;

  @ApiProperty()
  content!: string;

  @ApiPropertyOptional()
  contentBlocks!: Prisma.JsonValue | null;

  @ApiPropertyOptional()
  parentId!: string | null;

  @ApiPropertyOptional({ type: [String] })
  mentions!: string[];

  @ApiPropertyOptional()
  assigneeId!: string | null;

  @ApiPropertyOptional()
  assignedById!: string | null;

  @ApiPropertyOptional()
  editedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: CommentUserDto })
  author!: CommentUserDto | null;

  @ApiPropertyOptional({ type: CommentUserDto })
  assignee!: CommentUserDto | null;

  @ApiPropertyOptional({ type: CommentUserDto })
  assignedBy!: CommentUserDto | null;

  @ApiProperty({ type: [CommentReactionDto] })
  reactions!: CommentReactionDto[];

  static fromEntity(entity: CommentShape): CommentResponseDto {
    const dto = new CommentResponseDto();
    dto.id = entity.id;
    dto.workItemId = entity.workItemId;
    dto.authorId = entity.authorId;
    dto.content = entity.content;
    dto.contentBlocks = entity.contentBlocks;
    dto.parentId = entity.parentId;
    dto.mentions = Array.isArray(entity.mentions)
      ? (entity.mentions as string[])
      : [];
    dto.assigneeId = entity.assigneeId;
    dto.assignedById = entity.assignedById;
    dto.editedAt = entity.editedAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.author = entity.author ?? null;
    dto.assignee = entity.assignee ?? null;
    dto.assignedBy = entity.assignedBy ?? null;
    dto.reactions = entity.reactions ?? [];
    return dto;
  }
}

export class CommentsListResponseDto {
  @ApiProperty({ type: [CommentResponseDto] })
  items!: CommentResponseDto[];

  @ApiProperty()
  total!: number;
}
