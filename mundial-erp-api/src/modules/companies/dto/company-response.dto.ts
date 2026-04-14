import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Company } from '@prisma/client';

export class CompanyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  tradeName: string | null;

  @ApiPropertyOptional()
  cnpj: string | null;

  @ApiPropertyOptional()
  ie: string | null;

  @ApiPropertyOptional()
  phone: string | null;

  @ApiPropertyOptional()
  email: string | null;

  @ApiPropertyOptional()
  logoUrl: string | null;

  @ApiPropertyOptional()
  address: string | null;

  @ApiPropertyOptional()
  city: string | null;

  @ApiPropertyOptional()
  state: string | null;

  @ApiPropertyOptional()
  zipCode: string | null;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Company): CompanyResponseDto {
    const dto = new CompanyResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.tradeName = entity.tradeName;
    dto.cnpj = entity.cnpj;
    dto.ie = entity.ie;
    dto.phone = entity.phone;
    dto.email = entity.email;
    dto.logoUrl = entity.logoUrl;
    dto.address = entity.address;
    dto.city = entity.city;
    dto.state = entity.state;
    dto.zipCode = entity.zipCode;
    dto.proFinancasId = entity.proFinancasId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
