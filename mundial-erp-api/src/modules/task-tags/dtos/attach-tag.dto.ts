import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AttachTagDto {
  @ApiProperty()
  @IsString()
  @Length(1, 64)
  tagId!: string;
}
