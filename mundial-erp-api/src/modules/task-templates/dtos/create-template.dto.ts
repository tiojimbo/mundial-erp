import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskTemplateScope } from '@prisma/client';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO de criacao de `WorkItemTemplate` — PLANO-TASKS.md §7.3 (Task Templates).
 *
 * A validacao profunda do `payload` (estrutura, limite de 200 nos, profundidade
 * 3) e delegada ao pipe `TemplatePayloadValidatorPipe` no controller. Aqui
 * garantimos apenas o shape basico dos metadados.
 */
export class CreateTemplateDto {
  @ApiProperty({ minLength: 3, maxLength: 120 })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    enum: TaskTemplateScope,
    description:
      'Escopo: WORKSPACE (global), DEPARTMENT (exige departmentId) ou PROCESS (exige processId). Default: WORKSPACE.',
  })
  @IsOptional()
  @IsEnum(TaskTemplateScope)
  scope?: TaskTemplateScope;

  @ApiPropertyOptional({
    description:
      'Departamento do template (obrigatorio se scope=DEPARTMENT). Deve pertencer ao workspace.',
  })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({
    description:
      'Process do template (obrigatorio se scope=PROCESS). Deve pertencer ao workspace.',
  })
  @IsOptional()
  @IsString()
  processId?: string;

  @ApiProperty({
    description:
      'Payload JSON com a estrutura (title, subtasks, checklists). Validado pelo TemplatePayloadValidatorPipe.',
  })
  @IsObject()
  payload!: Record<string, unknown>;
}
