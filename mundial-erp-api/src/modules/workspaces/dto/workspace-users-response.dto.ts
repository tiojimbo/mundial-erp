import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';

export class WorkspaceUserDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  name!: string | null;

  @ApiPropertyOptional()
  email!: string | null;

  @ApiProperty({ enum: WorkspaceMemberRole })
  permission!: WorkspaceMemberRole;

  @ApiProperty()
  canCreateViews!: boolean;

  @ApiProperty()
  canManageTags!: boolean;

  @ApiProperty()
  joinedAt!: Date;
}

export class WorkspaceUsersResponseDto {
  @ApiProperty({ type: [WorkspaceUserDto] })
  users!: WorkspaceUserDto[];

  @ApiProperty()
  total!: number;
}
