import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RegisterPaymentDto {
  @ApiProperty({ example: 250000, description: 'Valor pago em centavos' })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  paidAmountCents: number;

  @ApiPropertyOptional({ example: 'https://storage.example.com/comprovante.pdf', description: 'URL do comprovante de pagamento' })
  @IsOptional()
  @IsString()
  paymentProofUrl?: string;
}
