import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSeparationOrderItemDto {
  @ApiProperty({ description: 'ID do item do pedido' })
  @IsString()
  @IsNotEmpty()
  orderItemId: string;

  @ApiProperty({ description: 'ID do produto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantidade a separar' })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ description: 'Quantidade em pecas' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pieces?: number;

  @ApiPropertyOptional({ description: 'Localizacao no estoque' })
  @IsOptional()
  @IsString()
  stockLocation?: string;
}

export class CreateSeparationOrderDto {
  @ApiProperty({ description: 'ID do pedido' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ description: 'ID do usuario responsavel' })
  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @ApiPropertyOptional({ description: 'Data agendada para separacao' })
  @IsOptional()
  @Type(() => Date)
  scheduledDate?: Date;

  @ApiPropertyOptional({
    type: [CreateSeparationOrderItemDto],
    description: 'Itens da ordem de separacao',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSeparationOrderItemDto)
  items?: CreateSeparationOrderItemDto[];
}
