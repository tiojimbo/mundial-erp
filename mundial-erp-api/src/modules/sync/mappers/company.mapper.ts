import { Prisma } from '@prisma/client';
import { PfCompany } from '../pro-financas/dto/pro-financas.types';

export class CompanyMapper {
  static toCreateInput(
    pf: PfCompany,
  ): Omit<Prisma.CompanyCreateInput, 'proFinancasId'> {
    return {
      name: pf.razao_social,
      tradeName: pf.nome_fantasia || null,
      cnpj: pf.cnpj?.replace(/[.\-/]/g, '') || null,
      ie: pf.ie || null,
      phone: pf.telefone || null,
      email: pf.email || null,
      logoUrl: pf.logo_url || null,
      address: pf.endereco || null,
      city: pf.cidade || null,
      state: pf.uf || null,
      zipCode: pf.cod_postal?.replace(/\D/g, '') || null,
    };
  }

  static checksumFields(pf: PfCompany): Record<string, unknown> {
    return {
      razao_social: pf.razao_social,
      nome_fantasia: pf.nome_fantasia,
      cnpj: pf.cnpj,
      telefone: pf.telefone,
      email: pf.email,
    };
  }
}
