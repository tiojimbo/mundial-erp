import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ToggleReactionDto {
  @ApiProperty({
    description: 'Emoji da reação (sequência unicode, até 16 chars).',
    example: '👍',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  emoji!: string;
}
