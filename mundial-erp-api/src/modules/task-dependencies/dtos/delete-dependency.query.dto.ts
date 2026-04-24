import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Validate, ValidatorConstraint } from 'class-validator';
import type { ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

/**
 * Query da rota `DELETE /tasks/:taskId/dependencies?dependsOn=&dependencyOf=`.
 * Mesmo invariante do POST: EXATAMENTE UM.
 */
@ValidatorConstraint({ name: 'ExactlyOneDependencyQueryField', async: false })
class ExactlyOneDependencyQueryFieldConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as Partial<DeleteDependencyQueryDto>;
    const provided = [dto.dependsOn, dto.dependencyOf].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
    return provided.length === 1;
  }

  defaultMessage(): string {
    return 'Informe EXATAMENTE UM dos query params: dependsOn OU dependencyOf.';
  }
}

export class DeleteDependencyQueryDto {
  @ApiPropertyOptional({ description: 'ID da task que bloqueia.' })
  @IsOptional()
  @IsString()
  dependsOn?: string;

  @ApiPropertyOptional({ description: 'ID da task bloqueada.' })
  @IsOptional()
  @IsString()
  dependencyOf?: string;

  @Validate(ExactlyOneDependencyQueryFieldConstraint)
  private readonly __exactlyOne__?: undefined;
}
