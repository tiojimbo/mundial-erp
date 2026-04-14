import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Neighborhood } from '@prisma/client';

export class NeighborhoodResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  cityId: string;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Neighborhood): NeighborhoodResponseDto {
    const dto = new NeighborhoodResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.cityId = entity.cityId;
    dto.proFinancasId = entity.proFinancasId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
