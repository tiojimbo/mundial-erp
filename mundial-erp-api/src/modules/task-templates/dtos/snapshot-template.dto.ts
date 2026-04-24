import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * Query de `POST /task-templates/:id/snapshot?fromTaskId=`.
 *
 * Em Sprint 6 o servico navega a subtree de `fromTaskId` e reescreve o
 * payload do template `:id` com a estrutura atual. Incrementa `version`.
 */
export class SnapshotTemplateQueryDto {
  @ApiProperty({
    description: 'Id da task raiz cujo subtree sera capturado como payload.',
  })
  @IsString()
  @MinLength(1)
  fromTaskId!: string;
}
