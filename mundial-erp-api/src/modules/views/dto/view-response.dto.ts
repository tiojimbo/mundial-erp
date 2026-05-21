import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProcessView, ViewType } from '@prisma/client';

export class ViewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  listId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ViewType })
  viewType: ViewType;

  @ApiProperty()
  isPinned: boolean;

  @ApiPropertyOptional()
  config: Record<string, any>;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: ProcessView): ViewResponseDto {
    const dto = new ViewResponseDto();
    dto.id = entity.id;
    dto.listId = entity.listId;
    dto.name = entity.name;
    dto.viewType = entity.viewType;
    dto.isPinned = entity.isPinned;
    dto.config = entity.config as Record<string, any>;
    dto.sortOrder = entity.sortOrder;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
