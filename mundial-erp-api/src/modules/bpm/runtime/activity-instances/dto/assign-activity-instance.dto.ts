import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AssignActivityInstanceDto {
  @ApiProperty({ description: 'ID do usuário a ser atribuído' })
  @IsString()
  @MinLength(1)
  userId: string;
}
