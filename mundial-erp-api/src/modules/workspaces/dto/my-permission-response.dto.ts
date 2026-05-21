import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';

export class MyPermissionResponseDto {
  @ApiProperty({ enum: WorkspaceMemberRole })
  permission!: WorkspaceMemberRole;

  @ApiProperty()
  canCreateViews!: boolean;

  @ApiProperty()
  canManageTags!: boolean;
}

export function resolveWorkspacePermissionFlags(role: WorkspaceMemberRole): {
  canCreateViews: boolean;
  canManageTags: boolean;
} {
  const isGuest = role === WorkspaceMemberRole.GUEST;
  return {
    canCreateViews: !isGuest,
    canManageTags: !isGuest,
  };
}
