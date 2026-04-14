import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateReactionDto {
  @ApiProperty({
    example: 'thumbsup',
    description: 'Nome do emoji em minusculas',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  emojiName: string;
}
