import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

/**
 * Body de `POST /tasks/time-in-status:bulk` (PLANO-TASKS.md §7.1).
 * Limite explicito 1..100 para proteger o servico (CTO note #9).
 */
export class TimeInStatusBulkDto {
  @ApiProperty({ type: [String], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  taskIds!: string[];
}
