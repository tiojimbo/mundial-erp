import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialCategory } from '@prisma/client';

type FinancialCategoryWithChildren = FinancialCategory & {
  children?: FinancialCategory[];
};

export class FinancialCategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['RECEITA', 'DESPESA'] })
  type: string;

  @ApiPropertyOptional()
  parentId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: () => [FinancialCategoryResponseDto] })
  children?: FinancialCategoryResponseDto[];

  static fromEntity(
    entity: FinancialCategoryWithChildren,
  ): FinancialCategoryResponseDto {
    const dto = new FinancialCategoryResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.type = entity.type;
    dto.parentId = entity.parentId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    if (entity.children) {
      dto.children = entity.children.map(
        FinancialCategoryResponseDto.fromEntity,
      );
    }
    return dto;
  }
}
