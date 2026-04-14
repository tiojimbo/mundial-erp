import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateActivityInstanceDto {
  @ApiProperty({ description: 'ID da atividade (definição)' })
  @IsString()
  @MinLength(1)
  activityId: string;

  @ApiProperty({ description: 'ID da instância de processo' })
  @IsString()
  @MinLength(1)
  processInstanceId: string;
}
