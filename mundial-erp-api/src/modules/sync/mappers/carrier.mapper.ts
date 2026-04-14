import { Prisma } from '@prisma/client';
import { PfCarrier } from '../pro-financas/dto/pro-financas.types';

export class CarrierMapper {
  static toCreateInput(pf: PfCarrier): Omit<Prisma.CarrierCreateInput, 'proFinancasId'> {
    return {
      name: pf.nome,
    };
  }

  static checksumFields(pf: PfCarrier): Record<string, unknown> {
    return { nome: pf.nome };
  }
}
