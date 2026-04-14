import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateSectorDto {
  @ApiProperty({ example: 'Vendas Internas' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'ID do departamento' })
  @IsString()
  @MinLength(1)
  departmentId: string;
}
