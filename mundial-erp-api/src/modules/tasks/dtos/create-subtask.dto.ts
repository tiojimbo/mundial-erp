import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateSubtaskDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  name!: string;
}
