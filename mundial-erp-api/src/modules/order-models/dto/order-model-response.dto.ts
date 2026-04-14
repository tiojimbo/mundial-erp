import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderModel } from '@prisma/client';

export class OrderModelResponseDto {
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

  static fromEntity(entity: OrderModel): OrderModelResponseDto {
    const dto = new OrderModelResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.proFinancasId = entity.proFinancasId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
