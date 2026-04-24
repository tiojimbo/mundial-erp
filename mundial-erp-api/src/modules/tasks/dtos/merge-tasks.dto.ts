import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

/**
 * Body de `POST /tasks/:taskId/merge` (PLANO-TASKS.md §7.1 + §8.4).
 * Aceita 1–50 source ids; target vem da rota.
 */
export class MergeTasksDto {
  @ApiProperty({ type: [String], minItems: 1, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  sourceTaskIds!: string[];
}
