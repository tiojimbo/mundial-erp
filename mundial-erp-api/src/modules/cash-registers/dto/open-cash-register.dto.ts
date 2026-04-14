import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class OpenCashRegisterDto {
  @ApiProperty({ example: 'clxyz1234567890' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 50000, description: 'Saldo de abertura em centavos' })
  @IsInt()
  @Min(0)
  openingBalanceCents: number;
}
