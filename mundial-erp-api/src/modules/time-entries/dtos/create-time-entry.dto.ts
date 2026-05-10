import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTimeEntryDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({
    description:
      'Duracao em segundos. Se omitido, e calculado como endTime - startTime.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
