import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrderFlowDto {
  @ApiProperty({ example: 'Fluxo Padrão' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 123 })
  @IsOptional()
  @IsInt()
  proFinancasId?: number;
}
