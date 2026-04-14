import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitMeasure } from '@prisma/client';

export class UnitMeasureResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: UnitMeasure): UnitMeasureResponseDto {
    const dto = new UnitMeasureResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.proFinancasId = entity.proFinancasId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
