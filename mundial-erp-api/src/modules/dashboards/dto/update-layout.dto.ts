import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class CardLayoutItemDto {
  @ApiProperty({ example: 'clxyz123card' })
  @IsString()
  cardId: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  layoutX: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  layoutY: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  layoutW: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  layoutH: number;
}

export class UpdateLayoutDto {
  @ApiProperty({ type: [CardLayoutItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardLayoutItemDto)
  cards: CardLayoutItemDto[];
}
