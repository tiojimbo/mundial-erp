import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSeparationOrderDto {
  @ApiPropertyOptional({ description: 'ID do usuario responsavel' })
  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @ApiPropertyOptional({ description: 'Data agendada para separacao' })
  @IsOptional()
  @Type(() => Date)
  scheduledDate?: Date;
}
