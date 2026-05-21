import { ApiProperty } from '@nestjs/swagger';
import { Visibility } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateFolderVisibilityDto {
  @ApiProperty({ enum: Visibility })
  @IsEnum(Visibility)
  visibility: Visibility;
}
