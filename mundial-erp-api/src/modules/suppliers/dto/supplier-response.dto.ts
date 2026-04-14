import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonType, Supplier } from '@prisma/client';

export class SupplierResponseDto {
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
  email: string | null;

  @ApiPropertyOptional()
  phone: string | null;

  @ApiPropertyOptional()
  address: string | null;

  @ApiPropertyOptional()
  city: string | null;

  @ApiPropertyOptional()
  state: string | null;

  @ApiPropertyOptional()
  zipCode: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Supplier): SupplierResponseDto {
    const dto = new SupplierResponseDto();
    dto.id = entity.id;
    dto.personType = entity.personType;
    dto.cpfCnpj = entity.cpfCnpj;
    dto.name = entity.name;
    dto.tradeName = entity.tradeName;
    dto.ie = entity.ie;
    dto.email = entity.email;
    dto.phone = entity.phone;
    dto.address = entity.address;
    dto.city = entity.city;
    dto.state = entity.state;
    dto.zipCode = entity.zipCode;
    dto.isActive = entity.isActive;
    dto.proFinancasId = entity.proFinancasId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
