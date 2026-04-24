import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body de `POST /processes/:processId/task-templates/:templateId/instances`.
 *
 * Em Sprint 6 o servico de instanciacao expande o payload do template em
 * arvore de WorkItems + checklists + items. Por ora e apenas um contrato.
 */
export class InstantiateTemplateDto {
  @ApiPropertyOptional({
    description:
      'Titulo da task raiz a ser criada. Quando ausente, usa o titulo definido no payload do template.',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description:
      'Id do WorkflowStatus inicial. Quando ausente, usa o status default do Process.',
  })
  @IsOptional()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional({
    description:
      'Id da task pai (se o template deve ser instanciado como subtree).',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}

/**
 * Resposta sintetica da instanciacao. O cliente deve recarregar a task via
 * `GET /tasks/:id` para hidratar o detalhe completo. Contadores denormalizados
 * (`nodesCreated`, `checklistsCreated`, `tagsCreated`) servem como feedback
 * imediato para a UI sem uma segunda round-trip.
 */
export class InstantiateTemplateResponseDto {
  @ApiProperty()
  rootTaskId!: string;

  @ApiProperty({
    description:
      'Numero total de WorkItems criados (inclui a raiz e todas as subtasks).',
  })
  nodesCreated!: number;

  @ApiProperty({
    description: 'Numero de checklists criados (somado em todos os niveis).',
  })
  checklistsCreated!: number;

  @ApiProperty({
    description:
      'Numero de tags distintas anexadas a raiz (find-or-create com dedup por nameLower).',
  })
  tagsCreated!: number;
}
