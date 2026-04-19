import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: WorkspaceMemberRole })
  @IsEnum(WorkspaceMemberRole)
  role!: WorkspaceMemberRole;
}
