import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Mundial Telhas', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiProperty({
    example: 'mundial-telhas',
    description:
      'Slug unico em minusculas, numeros e hifen (3 a 40 caracteres)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Use apenas letras minusculas, numeros e hifen',
  })
  slug!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: '#D97706',
    description: 'Cor em hex #RRGGBB',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Formato hex invalido (#RRGGBB)',
  })
  color?: string;
}
