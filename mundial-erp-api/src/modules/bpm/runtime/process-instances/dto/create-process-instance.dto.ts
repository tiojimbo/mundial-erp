import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateProcessInstanceDto {
  @ApiProperty({ description: 'ID do processo (definição)' })
  @IsString()
  @MinLength(1)
  listId: string;

  @ApiProperty({ description: 'ID do pedido' })
  @IsString()
  @MinLength(1)
  orderId: string;
}
