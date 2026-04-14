import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { City } from '@prisma/client';

export class CityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  stateId: string;

  @ApiPropertyOptional()
  ibgeCode: string | null;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: City): CityResponseDto {
    const dto = new CityResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.stateId = entity.stateId;
    dto.ibgeCode = entity.ibgeCode;
    dto.proFinancasId = entity.proFinancasId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
