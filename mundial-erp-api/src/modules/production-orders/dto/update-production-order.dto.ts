import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductionOrderDto {
  @ApiPropertyOptional({ example: 'SIM', description: 'Tipo da ordem (SIM/NAO)' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'clxyzmaq', description: 'ID da máquina' })
  @IsOptional()
  @IsString()
  machineId?: string;

  @ApiPropertyOptional({ example: 'LOTE-002', description: 'Lote' })
  @IsOptional()
  @IsString()
  batch?: string;

  @ApiPropertyOptional({ example: '2026-04-20T00:00:00Z', description: 'Data programada' })
  @IsOptional()
  @Type(() => Date)
  scheduledDate?: Date;

  @ApiPropertyOptional({ example: 'clxyzusr', description: 'ID do usuário responsável' })
  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @ApiPropertyOptional({ example: 'Notas atualizadas', description: 'Notas/observações' })
  @IsOptional()
  @IsString()
  notes?: string;
}
