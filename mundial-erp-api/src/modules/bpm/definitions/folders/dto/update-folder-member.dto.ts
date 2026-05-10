import { ApiProperty } from '@nestjs/swagger';
import { MemberPermission } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateFolderMemberDto {
  @ApiProperty({ enum: MemberPermission })
  @IsEnum(MemberPermission)
  permission: MemberPermission;
}
