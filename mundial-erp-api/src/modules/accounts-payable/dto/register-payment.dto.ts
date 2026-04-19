import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
} from 'class-validator';

export class RegisterPaymentDto {
  @ApiProperty({
    example: 50000,
    description: 'Valor do pagamento em centavos',
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  amountCents: number;

  @ApiPropertyOptional({
    example: '2026-04-07T00:00:00.000Z',
    description: 'Data do pagamento',
  })
  @IsOptional()
  @IsDateString()
  paidDate?: string;
}
