import { PersonType } from '@prisma/client';
import { PfClient } from '../pro-financas/dto/pro-financas.types';

export interface ClientMappedData {
  personType: PersonType;
  cpfCnpj: string;
  name: string;
  tradeName: string | null;
  ie: string | null;
  rg: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  classificationId: string | null;
  deliveryRouteId: string | null;
}

export class ClientMapper {
  static toMappedData(
    pf: PfClient,
    classificationErpId: string | null,
    deliveryRouteErpId: string | null,
  ): ClientMappedData {
    return {
      personType: pf.tipo === 'J' ? PersonType.J : PersonType.F,
      cpfCnpj: (pf.cnpj_cpf || '').replace(/[.\-\/]/g, ''),
      name: pf.razao_social,
      tradeName: pf.nome_fantasia || null,
      ie: pf.ie || null,
      rg: pf.rg || null,
      email: pf.email || null,
      phone: pf.telefone || null,
      address: pf.endereco || pf.end_formatado || null,
      addressNumber: pf.numero || null,
      neighborhood: pf.bairro || null,
      complement: pf.complemento || null,
      city: pf.cidade || null,
      state: pf.uf || null,
      zipCode: pf.cod_postal?.replace(/\D/g, '') || null,
      classificationId: classificationErpId,
      deliveryRouteId: deliveryRouteErpId,
    };
  }

  static checksumFields(pf: PfClient): Record<string, unknown> {
    return {
      tipo: pf.tipo,
      cnpj_cpf: pf.cnpj_cpf,
      razao_social: pf.razao_social,
      nome_fantasia: pf.nome_fantasia,
      email: pf.email,
      telefone: pf.telefone,
      endereco: pf.endereco,
      cidade: pf.cidade,
      uf: pf.uf,
      cod_postal: pf.cod_postal,
      cliente_classificacao_id: pf.cliente_classificacao_id,
      cliente_rota_entrega_id: pf.cliente_rota_entrega_id,
    };
  }
}
