import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SetPermissionDto {
  @ApiProperty({ enum: WorkspaceMemberRole })
  @IsEnum(WorkspaceMemberRole)
  permission!: WorkspaceMemberRole;
}
