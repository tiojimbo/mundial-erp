import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Carrier } from '@prisma/client';

export class CarrierResponseDto {
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

  static fromEntity(entity: Carrier): CarrierResponseDto {
    const dto = new CarrierResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.proFinancasId = entity.proFinancasId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
