import { ApiProperty } from '@nestjs/swagger';
import { MemberPermission } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class AddSpaceMemberDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: MemberPermission })
  @IsEnum(MemberPermission)
  permission: MemberPermission;
}
