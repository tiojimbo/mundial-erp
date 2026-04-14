import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PersonType } from '@prisma/client';

export class CreateSupplierDto {
  @ApiProperty({ enum: PersonType, example: 'J', description: 'F = Pessoa Física, J = Pessoa Jurídica' })
  @IsEnum(PersonType)
  personType: PersonType;

  @ApiProperty({ example: '12.345.678/0001-99', description: 'CPF ou CNPJ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(18)
  cpfCnpj: string;

  @ApiProperty({ example: 'Fornecedor ABC Ltda' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'ABC Materiais' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string;

  @ApiPropertyOptional({ example: '123456789', description: 'Inscrição Estadual' })
  @IsOptional()
  @IsString()
  ie?: string;

  @ApiPropertyOptional({ example: 'contato@abc.com' })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Rua Industrial, 500' })
  @IsOptional()
  @IsString()
  address?: string;

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

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsInt()
  proFinancasId?: number;
}
