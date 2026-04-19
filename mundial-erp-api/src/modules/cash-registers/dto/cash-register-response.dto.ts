import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CashRegisterResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  openedByUserId: string;

  @ApiPropertyOptional()
  closedByUserId: string | null;

  @ApiProperty()
  openedAt: Date;

  @ApiPropertyOptional()
  closedAt: Date | null;

  @ApiProperty()
  openingBalanceCents: number;

  @ApiPropertyOptional()
  closingBalanceCents: number | null;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Record<string, unknown>): CashRegisterResponseDto {
    const dto = new CashRegisterResponseDto();
    dto.id = entity.id as string;
    dto.companyId = entity.companyId as string;
    dto.openedByUserId = entity.openedByUserId as string;
    dto.closedByUserId = (entity.closedByUserId as string) ?? null;
    dto.openedAt = entity.openedAt as Date;
    dto.closedAt = (entity.closedAt as Date) ?? null;
    dto.openingBalanceCents = entity.openingBalanceCents as number;
    dto.closingBalanceCents = (entity.closingBalanceCents as number) ?? null;
    dto.proFinancasId = (entity.proFinancasId as number) ?? null;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    return dto;
  }
}
