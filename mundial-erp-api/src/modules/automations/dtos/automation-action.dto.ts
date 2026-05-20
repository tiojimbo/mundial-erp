import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';
import { ACTION_IDS } from '../catalog/actions.catalog';

const ACTION_ID_VALUES = ACTION_IDS as readonly string[];

export class AutomationActionDto {
  @ApiProperty({ enum: ACTION_ID_VALUES, example: 'change_status' })
  @IsString()
  type: string;

  @ApiProperty({ example: { statusId: 'cuid' } })
  @IsObject()
  params: Record<string, unknown>;
}
