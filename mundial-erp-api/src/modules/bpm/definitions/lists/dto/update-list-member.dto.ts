import { ApiProperty } from '@nestjs/swagger';
import { MemberPermission } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateListMemberDto {
  @ApiProperty({ enum: MemberPermission })
  @IsEnum(MemberPermission)
  permission: MemberPermission;
}
