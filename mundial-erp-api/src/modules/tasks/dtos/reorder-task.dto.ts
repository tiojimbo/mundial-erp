import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class ReorderTaskDto {
  @ApiProperty()
  @IsString()
  viewId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  beforeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  afterId?: string;

  @ValidateIf((o: ReorderTaskDto) => !o.beforeId && !o.afterId)
  @IsString({ message: 'Informe beforeId ou afterId' })
  readonly _anchorCheck?: string;
}
