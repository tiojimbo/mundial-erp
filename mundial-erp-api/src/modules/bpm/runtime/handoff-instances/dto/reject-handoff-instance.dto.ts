import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectHandoffInstanceDto {
  @ApiProperty({ description: 'Motivo da rejeição' })
  @IsString()
  @MinLength(1)
  reason: string;
}
