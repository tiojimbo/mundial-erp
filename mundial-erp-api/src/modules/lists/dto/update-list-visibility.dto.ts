import { ApiProperty } from '@nestjs/swagger';
import { Visibility } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateListVisibilityDto {
  @ApiProperty({ enum: Visibility })
  @IsEnum(Visibility)
  visibility: Visibility;
}
