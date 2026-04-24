import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Regex de cor hexadecimal aceitando `#RGB`, `#RRGGBB` ou `#RRGGBBAA`.
 * Documentado aqui para que a ui consuma o mesmo contrato.
 */
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export class CreateTaskTagDto {
  @ApiProperty({ minLength: 3, maxLength: 50, example: 'urgent' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional({
    example: '#111827',
    description: 'Cor do texto (#RGB, #RRGGBB ou #RRGGBBAA).',
  })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, {
    message: 'color deve ser hex #RGB, #RRGGBB ou #RRGGBBAA',
  })
  color?: string;

  @ApiPropertyOptional({
    example: '#fde68a',
    description: 'Cor de fundo (#RGB, #RRGGBB ou #RRGGBBAA).',
  })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, {
    message: 'bgColor deve ser hex #RGB, #RRGGBB ou #RRGGBBAA',
  })
  bgColor?: string;
}
