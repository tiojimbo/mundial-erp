import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePersonalAccessTokenDto {
  @ApiProperty({ example: 'Integração Zapier', description: 'Nome para identificar a API key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
