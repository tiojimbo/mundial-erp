import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderFlow } from '@prisma/client';

export class OrderFlowResponseDto {
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

  static fromEntity(entity: OrderFlow): OrderFlowResponseDto {
    const dto = new OrderFlowResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.proFinancasId = entity.proFinancasId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
