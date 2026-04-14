import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateHandoffDto {
  @ApiProperty({ description: 'ID do processo de origem' })
  @IsString()
  @MinLength(1)
  fromProcessId: string;

  @ApiProperty({ description: 'ID do processo de destino' })
  @IsString()
  @MinLength(1)
  toProcessId: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  triggerOnStatus?: OrderStatus;

  @ApiPropertyOptional({ example: { minValue: 1000 } })
  @IsOptional()
  @IsObject()
  validationRules?: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoAdvance?: boolean;
}
