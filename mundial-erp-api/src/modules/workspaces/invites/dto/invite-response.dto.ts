import { ApiProperty } from '@nestjs/swagger';
import { InviteStatus, WorkspaceMemberRole } from '@prisma/client';

export class InviteResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: WorkspaceMemberRole })
  role!: WorkspaceMemberRole;

  @ApiProperty({ enum: InviteStatus })
  status!: InviteStatus;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty()
  invitedById!: string;

  @ApiProperty()
  createdAt!: Date;

  static fromEntity(entity: Record<string, unknown>): InviteResponseDto {
    const dto = new InviteResponseDto();
    dto.id = entity.id as string;
    dto.workspaceId = entity.workspaceId as string;
    dto.email = entity.email as string;
    dto.role = entity.role as WorkspaceMemberRole;
    dto.status = entity.status as InviteStatus;
    dto.expiresAt = entity.expiresAt as Date;
    dto.invitedById = entity.invitedById as string;
    dto.createdAt = entity.createdAt as Date;
    return dto;
  }
}

// Token exposto APENAS na criação — em listagens não vai. NUNCA logar.
export class InviteCreatedResponseDto extends InviteResponseDto {
  @ApiProperty()
  token!: string;

  static fromEntityWithToken(
    entity: Record<string, unknown>,
  ): InviteCreatedResponseDto {
    const dto = new InviteCreatedResponseDto();
    dto.id = entity.id as string;
    dto.workspaceId = entity.workspaceId as string;
    dto.email = entity.email as string;
    dto.role = entity.role as WorkspaceMemberRole;
    dto.status = entity.status as InviteStatus;
    dto.expiresAt = entity.expiresAt as Date;
    dto.invitedById = entity.invitedById as string;
    dto.createdAt = entity.createdAt as Date;
    dto.token = entity.token as string;
    return dto;
  }
}

export class AcceptInviteResponseDto {
  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  memberId!: string;

  @ApiProperty({ enum: WorkspaceMemberRole })
  role!: WorkspaceMemberRole;

  // false = re-aceite idempotente (user já era membro).
  @ApiProperty()
  created!: boolean;

  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: () => Object })
  workspace!: unknown;
}
