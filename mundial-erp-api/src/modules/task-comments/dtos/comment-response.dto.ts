import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export interface CommentShape {
  id: string;
  workItemId: string;
  authorId: string;
  body: string;
  bodyBlocks: Prisma.JsonValue | null;
  parentId: string | null;
  mentions: Prisma.JsonValue | null;
  assigneeId: string | null;
  assignedById: string | null;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class CommentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workItemId!: string;

  @ApiProperty()
  authorId!: string;

  @ApiProperty()
  body!: string;

  @ApiPropertyOptional()
  bodyBlocks!: Prisma.JsonValue | null;

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

  static fromEntity(entity: CommentShape): CommentResponseDto {
    const dto = new CommentResponseDto();
    dto.id = entity.id;
    dto.workItemId = entity.workItemId;
    dto.authorId = entity.authorId;
    dto.body = entity.body;
    dto.bodyBlocks = entity.bodyBlocks;
    dto.parentId = entity.parentId;
    dto.mentions = Array.isArray(entity.mentions)
      ? (entity.mentions as string[])
      : [];
    dto.assigneeId = entity.assigneeId;
    dto.assignedById = entity.assignedById;
    dto.editedAt = entity.editedAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

export class CommentsListResponseDto {
  @ApiProperty({ type: [CommentResponseDto] })
  items!: CommentResponseDto[];

  @ApiProperty()
  total!: number;
}
