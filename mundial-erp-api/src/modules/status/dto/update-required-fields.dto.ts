import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateRequiredFieldsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  customFieldIds: string[];
}
