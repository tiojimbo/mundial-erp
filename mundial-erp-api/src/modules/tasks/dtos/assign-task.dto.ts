import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AssigneeRefDto {
  @ApiProperty()
  @IsString()
  userId!: string;
}

/**
 * `PUT /tasks/:taskId/assign` (HPP-056). Substitui a lista completa de
 * assignees. Lista vazia faz o backend re-adicionar o creator.
 */
export class AssignTaskDto {
  @ApiProperty({ type: [AssigneeRefDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AssigneeRefDto)
  assignees!: AssigneeRefDto[];
}
