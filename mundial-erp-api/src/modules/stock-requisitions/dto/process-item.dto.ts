import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, Min } from 'class-validator';

export class ProcessItemDto {
  @ApiProperty({ description: 'Tipo de unidade: UN ou CX', enum: ['UN', 'CX'] })
  @IsIn(['UN', 'CX'])
  unitType: string;

  @ApiProperty({ description: 'Quantidade real retirada' })
  @IsNumber()
  @Min(0.01)
  actualQuantity: number;
}
