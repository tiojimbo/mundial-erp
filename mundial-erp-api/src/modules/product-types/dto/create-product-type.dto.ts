import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateProductTypeDto {
  @ApiProperty({ example: 'TT', description: 'Prefixo de 2 letras maiúsculas' })
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, {
    message: 'prefix deve conter exatamente 2 letras maiúsculas',
  })
  prefix: string;

  @ApiProperty({ example: 'Tecido Têxtil' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: '0101',
    description: 'Código de departamento EAN com 4 dígitos',
  })
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, {
    message: 'eanDeptCode deve conter exatamente 4 dígitos',
  })
  eanDeptCode: string;
}
