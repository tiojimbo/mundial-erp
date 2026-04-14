import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProcessStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProcessDto {
  @ApiProperty({ example: 'Venda Nacional' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'ID do setor' })
  @IsString()
  @MinLength(1)
  sectorId: string;

  @ApiPropertyOptional({ enum: ProcessStatus, default: ProcessStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProcessStatus)
  status?: ProcessStatus;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
