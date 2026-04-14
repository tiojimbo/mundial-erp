import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class RegisterPaymentDto {
  @ApiProperty({ example: 50000, description: 'Valor do pagamento em centavos' })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  amountCents: number;

  @ApiPropertyOptional({ example: '2026-04-07', description: 'Data do pagamento (ISO 8601). Se omitido, usa data atual.' })
  @IsOptional()
  @IsDateString()
  paidDate?: string;
}
