import { ApiProperty } from '@nestjs/swagger';
import { AutomationScopeType, AutomationTrigger } from '@prisma/client';

export class AutomationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  createdById: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ enum: AutomationTrigger })
  trigger: AutomationTrigger;

  @ApiProperty({ enum: AutomationScopeType })
  scopeType: AutomationScopeType;

  @ApiProperty({ nullable: true })
  scopeId: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  compiledActions: unknown;

  @ApiProperty({ type: 'object', additionalProperties: true })
  conditions: unknown;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  executionCount: number;

  @ApiProperty({ nullable: true })
  lastExecutedAt: Date | null;

  @ApiProperty({ nullable: true })
  cronExpression: string | null;

  @ApiProperty({ nullable: true })
  timezone: string | null;

  @ApiProperty({ nullable: true })
  nextRunAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
