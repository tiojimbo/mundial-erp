import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompaniesRepository } from './companies.repository';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyResponseDto } from './dto/company-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly companiesRepository: CompaniesRepository) {}

  async create(dto: CreateCompanyDto): Promise<CompanyResponseDto> {
    if (dto.cnpj) {
      const existing = await this.companiesRepository.findByCnpj(dto.cnpj);
      if (existing) {
        throw new ConflictException('Empresa com este CNPJ já existe');
      }
    }

    const entity = await this.companiesRepository.create({
      name: dto.name,
      tradeName: dto.tradeName,
      cnpj: dto.cnpj,
      ie: dto.ie,
      phone: dto.phone,
      email: dto.email,
      logoUrl: dto.logoUrl,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      zipCode: dto.zipCode,
      proFinancasId: dto.proFinancasId,
    });

    return CompanyResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto, search?: string) {
    const { items, total } = await this.companiesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      search,
    });
    return {
      items: items.map(CompanyResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<CompanyResponseDto> {
    const entity = await this.companiesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return CompanyResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<CompanyResponseDto> {
    const entity = await this.companiesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (dto.cnpj) {
      const existing = await this.companiesRepository.findByCnpj(dto.cnpj);
      if (existing && existing.id !== id) {
        throw new ConflictException('Empresa com este CNPJ já existe');
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.tradeName !== undefined) updateData.tradeName = dto.tradeName;
    if (dto.cnpj !== undefined) updateData.cnpj = dto.cnpj;
    if (dto.ie !== undefined) updateData.ie = dto.ie;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.zipCode !== undefined) updateData.zipCode = dto.zipCode;
    if (dto.proFinancasId !== undefined) updateData.proFinancasId = dto.proFinancasId;

    const updated = await this.companiesRepository.update(id, updateData);
    return CompanyResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.companiesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Empresa não encontrada');
    }
    await this.companiesRepository.softDelete(id);
  }
}
