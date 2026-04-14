import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChangeStatusDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsString()
  statusId: string;
}
