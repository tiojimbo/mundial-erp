import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutomationScopeType, AutomationTrigger } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AutomationActionDto } from './automation-action.dto';
import { AutomationConditionDto } from './automation-condition.dto';

export class CreateAutomationDto {
  @ApiProperty({ example: 'Auto-atribuir tarefas de pedidos novos' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    example: 'Atribui ao gerente quando lead vira pedido',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: AutomationTrigger })
  @IsEnum(AutomationTrigger)
  trigger: AutomationTrigger;

  @ApiProperty({ enum: AutomationScopeType })
  @IsEnum(AutomationScopeType)
  scopeType: AutomationScopeType;

  @ApiPropertyOptional({
    description:
      'ID do recurso de escopo (space/folder/list). Obrigatório quando scopeType ≠ WORKSPACE.',
  })
  @ValidateIf((o) => o.scopeType !== 'WORKSPACE')
  @IsString()
  @IsNotEmpty({ message: 'scopeId é obrigatório quando scopeType ≠ WORKSPACE' })
  scopeId?: string;

  @ApiProperty({
    type: [AutomationActionDto],
    description: 'Ordem importa. Executadas sequencialmente.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  compiledActions: AutomationActionDto[];

  @ApiPropertyOptional({
    type: [AutomationConditionDto],
    description:
      'Avaliadas com AND. Default: [] (sem condição = sempre executa).',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationConditionDto)
  conditions?: AutomationConditionDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Cron expression (obrigatório quando trigger=CRON)',
    example: '0 9 * * 1-5',
  })
  @ValidateIf((o) => o.trigger === 'CRON')
  @IsString()
  @IsNotEmpty({ message: 'cronExpression é obrigatório quando trigger=CRON' })
  cronExpression?: string;

  @ApiPropertyOptional({
    description: 'IANA timezone (obrigatório quando trigger=CRON)',
    example: 'America/Sao_Paulo',
  })
  @ValidateIf((o) => o.trigger === 'CRON')
  @IsString()
  @IsNotEmpty({ message: 'timezone é obrigatório quando trigger=CRON' })
  timezone?: string;
}
