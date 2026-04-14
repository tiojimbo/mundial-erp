import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { State } from '@prisma/client';

export class StateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  uf: string;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: State): StateResponseDto {
    const dto = new StateResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.uf = entity.uf;
    dto.proFinancasId = entity.proFinancasId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
