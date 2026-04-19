import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ChannelMemberRole } from '@prisma/client';

export class AddMembersDto {
  @ApiProperty({
    type: [String],
    description: 'IDs dos usuarios a adicionar (max 100)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @Matches(/^c[a-z0-9]{20,30}$/, {
    each: true,
    message: 'Cada userId deve ser um CUID valido',
  })
  userIds: string[];

  @ApiPropertyOptional({ enum: ChannelMemberRole, default: 'MEMBER' })
  @IsOptional()
  @IsEnum(ChannelMemberRole)
  role?: ChannelMemberRole;
}
