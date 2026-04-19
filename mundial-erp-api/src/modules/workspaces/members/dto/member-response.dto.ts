import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';

export class MemberResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: WorkspaceMemberRole })
  role!: WorkspaceMemberRole;

  @ApiProperty()
  joinedAt!: Date;

  @ApiPropertyOptional()
  userName!: string | null;

  @ApiPropertyOptional()
  userEmail!: string | null;

  static fromEntity(entity: Record<string, unknown>): MemberResponseDto {
    const dto = new MemberResponseDto();
    dto.id = entity.id as string;
    dto.workspaceId = entity.workspaceId as string;
    dto.userId = entity.userId as string;
    dto.role = entity.role as WorkspaceMemberRole;
    dto.joinedAt = entity.joinedAt as Date;

    const user = entity.user as { name?: string; email?: string } | undefined;
    dto.userName = user?.name ?? null;
    dto.userEmail = user?.email ?? null;
    return dto;
  }
}
