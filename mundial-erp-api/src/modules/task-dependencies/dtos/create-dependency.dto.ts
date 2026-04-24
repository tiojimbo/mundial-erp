import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Validate, ValidatorConstraint } from 'class-validator';
import type { ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

/**
 * Regra inegociavel (PLANO-TASKS.md §7.3 R1): body exige EXATAMENTE UM dos
 * campos `dependsOn` ou `dependencyOf`. Nem zero nem dois.
 *
 * - `dependsOn = X`: a task da rota (`:taskId`) depende de `X` (X bloqueia).
 *   Cria aresta `WorkItemDependency(from=X, to=taskId)`.
 * - `dependencyOf = X`: a task da rota bloqueia `X`.
 *   Cria aresta `WorkItemDependency(from=taskId, to=X)`.
 */
@ValidatorConstraint({ name: 'ExactlyOneDependencyField', async: false })
class ExactlyOneDependencyFieldConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as Partial<CreateDependencyDto>;
    const provided = [dto.dependsOn, dto.dependencyOf].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
    return provided.length === 1;
  }

  defaultMessage(): string {
    return 'Informe EXATAMENTE UM dos campos: dependsOn OU dependencyOf.';
  }
}

export class CreateDependencyDto {
  @ApiPropertyOptional({
    description:
      'ID da task que bloqueia a task da rota (a task da rota depende dela).',
  })
  @IsOptional()
  @IsString()
  dependsOn?: string;

  @ApiPropertyOptional({
    description:
      'ID da task que e bloqueada pela task da rota (a task da rota bloqueia esta).',
  })
  @IsOptional()
  @IsString()
  dependencyOf?: string;

  // Propriedade "fantasma" usada apenas para ancorar o validador cruzado;
  // class-validator requer decorar uma key — escolhemos uma cuja existencia
  // em runtime nao polui o DTO.
  @Validate(ExactlyOneDependencyFieldConstraint)
  private readonly __exactlyOne__?: undefined;
}
