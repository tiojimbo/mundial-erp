import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CloseCashRegisterDto {
  @ApiProperty({
    example: 75000,
    description: 'Saldo de fechamento em centavos',
  })
  @IsInt()
  @Min(0)
  closingBalanceCents: number;
}
