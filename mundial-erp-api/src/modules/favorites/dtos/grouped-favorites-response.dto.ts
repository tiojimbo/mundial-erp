import { ApiProperty } from '@nestjs/swagger';
import { FavoriteResponseDto } from './favorite-response.dto';

export class GroupedFavoritesResponseDto {
  @ApiProperty({ type: [FavoriteResponseDto] })
  TOP!: FavoriteResponseDto[];

  @ApiProperty({ type: [FavoriteResponseDto] })
  SIDEBAR!: FavoriteResponseDto[];

  @ApiProperty({ type: [FavoriteResponseDto] })
  BOTTOM!: FavoriteResponseDto[];
}
