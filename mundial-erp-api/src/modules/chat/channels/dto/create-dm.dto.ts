import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateDmDto {
  @ApiPropertyOptional({
    description:
      'IDs dos participantes (max 14, + voce = 15). Vazio = Self DM.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(14)
  @IsString({ each: true })
  userIds?: string[];
}
