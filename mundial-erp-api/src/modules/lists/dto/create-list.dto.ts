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

export class CreateListDto {
  @ApiProperty({ example: 'Venda Nacional' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'ID do folder pai. Lists sempre vivem dentro de um folder.',
  })
  @IsString()
  folderId: string;

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

  @ApiPropertyOptional({
    nullable: true,
    description:
      'CustomTaskType id usado como tipo padrão da list (paridade Hoppe). null remove.',
  })
  @IsOptional()
  @IsString()
  defaultTaskTypeId?: string | null;
}
