import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, Role } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({ example: 'Emitir nota fiscal', description: 'Verbo infinitivo + objeto' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ description: 'ID do processo' })
  @IsString()
  @MinLength(1)
  processId: string;

  @ApiProperty({ enum: Role, example: Role.OPERATOR })
  @IsEnum(Role)
  ownerRole: Role;

  @ApiPropertyOptional({ example: 'Pedido aprovado pelo gerente' })
  @IsOptional()
  @IsString()
  inputDescription?: string;

  @ApiPropertyOptional({ example: 'Nota fiscal emitida no sistema' })
  @IsOptional()
  @IsString()
  outputDescription?: string;

  @ApiPropertyOptional({ example: 60, description: 'SLA em minutos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  slaMinutes?: number;

  @ApiPropertyOptional({ example: 'Cliente sem cadastro completo' })
  @IsOptional()
  @IsString()
  exceptions?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  triggerOnStatus?: OrderStatus;
}
