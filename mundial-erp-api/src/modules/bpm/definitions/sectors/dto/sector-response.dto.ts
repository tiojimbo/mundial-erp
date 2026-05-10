import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sector } from '@prisma/client';

export class SectorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  spaceId: string;

  @ApiPropertyOptional()
  departmentName?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: Sector & { department?: { name: string } },
  ): SectorResponseDto {
    const dto = new SectorResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.spaceId = entity.spaceId;
    dto.departmentName = entity.department?.name;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
