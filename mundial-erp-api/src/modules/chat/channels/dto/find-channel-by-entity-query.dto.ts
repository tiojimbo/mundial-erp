import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const ENTITY_TYPES = ['space', 'folder', 'list', 'task'] as const;
export type ChannelEntityType = (typeof ENTITY_TYPES)[number];

export class FindChannelByEntityQueryDto {
  @ApiProperty({ enum: ENTITY_TYPES })
  @IsString()
  @IsIn(ENTITY_TYPES as unknown as string[])
  type!: ChannelEntityType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  entityId!: string;
}
