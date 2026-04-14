import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({ example: 'Atendimento ao Cliente' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'ID do departamento' })
  @IsString()
  @MinLength(1)
  departmentId: string;

  @ApiPropertyOptional({ example: 0, description: 'Ordem de exibição' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
