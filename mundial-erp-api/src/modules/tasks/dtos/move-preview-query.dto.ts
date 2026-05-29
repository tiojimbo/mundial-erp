import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class MovePreviewQueryDto {
  @ApiProperty({
    description: 'IDs das tasks (CSV ou repetido). Ex: ?taskIds=a,b',
  })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string')
      return value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    return [];
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  taskIds!: string[];

  @ApiProperty()
  @IsString()
  targetListId!: string;
}
