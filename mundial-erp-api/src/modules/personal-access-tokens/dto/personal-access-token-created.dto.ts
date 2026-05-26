import { ApiProperty } from '@nestjs/swagger';
import { PersonalAccessTokenResponseDto } from './personal-access-token-response.dto';

export class PersonalAccessTokenCreatedDto extends PersonalAccessTokenResponseDto {
  @ApiProperty({
    example: 'pk_0xZ0YWQ4sR3YQJgc4MOWZLzz_PfxLY26PkPgir87Eqg',
    description: 'Token bruto, exibido apenas na criação',
  })
  token: string;
}
