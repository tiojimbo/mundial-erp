import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProcessStatus, ProcessType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProcessDto {
  @ApiProperty({ example: 'Venda Nacional' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    description: 'ID do setor (legado, opcional para novos processos)',
  })
  @IsOptional()
  @IsString()
  sectorId?: string;

  @ApiPropertyOptional({
    description: 'ID da área (processo dentro de uma área)',
  })
  @IsOptional()
  @IsString()
  areaId?: string;

  @ApiPropertyOptional({
    description: 'ID do departamento (processo direto, sem área)',
  })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'Descrição do processo' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ enum: ProcessType, default: ProcessType.LIST })
  @IsOptional()
  @IsEnum(ProcessType)
  processType?: ProcessType;

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
