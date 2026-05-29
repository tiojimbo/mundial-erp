import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppearanceMode } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Senha atual (obrigatória ao trocar senha)',
  })
  @ValidateIf((o: UpdateMeDto) => !!o.password)
  @IsString()
  @MinLength(1, { message: 'Senha atual é obrigatória para alterar a senha' })
  currentPassword?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ description: 'URL do avatar' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: '#3b82f6', description: 'Cor do tema (hex)' })
  @IsOptional()
  @IsString()
  themeColor?: string;

  @ApiPropertyOptional({ enum: AppearanceMode })
  @IsOptional()
  @IsEnum(AppearanceMode)
  appearance?: AppearanceMode;
}
