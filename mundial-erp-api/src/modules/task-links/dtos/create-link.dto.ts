import { ApiProperty } from '@nestjs/swagger';
import { LinkType } from '@prisma/client';
import { IsEnum, IsString, Length } from 'class-validator';

export class CreateLinkDto {
  @ApiProperty({ description: 'Id da task no outro lado da relacao' })
  @IsString()
  @Length(1, 64)
  taskToId!: string;

  @ApiProperty({ enum: LinkType, default: LinkType.RELATES_TO })
  @IsEnum(LinkType)
  type!: LinkType;
}
