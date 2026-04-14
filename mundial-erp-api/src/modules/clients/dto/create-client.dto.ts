import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PersonType } from '@prisma/client';

export class CreateClientDto {
  @ApiProperty({ enum: PersonType, example: 'F', description: 'F = Pessoa Física, J = Pessoa Jurídica' })
  @IsEnum(PersonType)
  personType: PersonType;

  @ApiProperty({ example: '123.456.789-00', description: 'CPF (PF) ou CNPJ (PJ)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(18)
  cpfCnpj: string;

  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'JS Materiais' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string;

  @ApiPropertyOptional({ example: '123456789', description: 'Inscrição Estadual' })
  @IsOptional()
  @IsString()
  ie?: string;

  @ApiPropertyOptional({ example: '12.345.678-9', description: 'RG (apenas PF)' })
  @IsOptional()
  @IsString()
  rg?: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Rua das Flores' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  addressNumber?: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'Bloco A' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @ApiPropertyOptional({ example: '01234-567' })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  zipCode?: string;

  @ApiPropertyOptional({ example: 'cuid-classification-id' })
  @IsOptional()
  @IsString()
  classificationId?: string;

  @ApiPropertyOptional({ example: 'cuid-delivery-route-id' })
  @IsOptional()
  @IsString()
  deliveryRouteId?: string;

  @ApiPropertyOptional({ example: 'cuid-price-table-id' })
  @IsOptional()
  @IsString()
  defaultPriceTableId?: string;

  @ApiPropertyOptional({ example: 'cuid-payment-method-id' })
  @IsOptional()
  @IsString()
  defaultPaymentMethodId?: string;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsInt()
  proFinancasId?: number;
}
