import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Client, PersonType } from '@prisma/client';

export class ClientResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: PersonType })
  personType: PersonType;

  @ApiProperty()
  cpfCnpj: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  tradeName: string | null;

  @ApiPropertyOptional()
  ie: string | null;

  @ApiPropertyOptional()
  rg: string | null;

  @ApiPropertyOptional()
  email: string | null;

  @ApiPropertyOptional()
  phone: string | null;

  @ApiPropertyOptional()
  address: string | null;

  @ApiPropertyOptional()
  addressNumber: string | null;

  @ApiPropertyOptional()
  neighborhood: string | null;

  @ApiPropertyOptional()
  complement: string | null;

  @ApiPropertyOptional()
  city: string | null;

  @ApiPropertyOptional()
  state: string | null;

  @ApiPropertyOptional()
  zipCode: string | null;

  @ApiPropertyOptional()
  classificationId: string | null;

  @ApiPropertyOptional()
  deliveryRouteId: string | null;

  @ApiPropertyOptional()
  defaultPriceTableId: string | null;

  @ApiPropertyOptional()
  defaultPaymentMethodId: string | null;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Record<string, unknown>): ClientResponseDto {
    const dto = new ClientResponseDto();
    dto.id = entity.id as string;
    dto.personType = entity.personType as PersonType;
    dto.cpfCnpj = entity.cpfCnpj as string;
    dto.name = entity.name as string;
    dto.tradeName = (entity.tradeName as string) ?? null;
    dto.ie = (entity.ie as string) ?? null;
    dto.rg = (entity.rg as string) ?? null;
    dto.email = (entity.email as string) ?? null;
    dto.phone = (entity.phone as string) ?? null;
    dto.address = (entity.address as string) ?? null;
    dto.addressNumber = (entity.addressNumber as string) ?? null;
    dto.neighborhood = (entity.neighborhood as string) ?? null;
    dto.complement = (entity.complement as string) ?? null;
    dto.city = (entity.city as string) ?? null;
    dto.state = (entity.state as string) ?? null;
    dto.zipCode = (entity.zipCode as string) ?? null;
    dto.classificationId = (entity.classificationId as string) ?? null;
    dto.deliveryRouteId = (entity.deliveryRouteId as string) ?? null;
    dto.defaultPriceTableId = (entity.defaultPriceTableId as string) ?? null;
    dto.defaultPaymentMethodId = (entity.defaultPaymentMethodId as string) ?? null;
    dto.proFinancasId = (entity.proFinancasId as number) ?? null;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    return dto;
  }
}
