import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FavoriteResponseDto } from './favorite-response.dto';

export class CheckFavoriteResponseDto {
  @ApiProperty()
  favorited!: boolean;

  @ApiPropertyOptional({ type: FavoriteResponseDto, nullable: true })
  favorite!: FavoriteResponseDto | null;
}
