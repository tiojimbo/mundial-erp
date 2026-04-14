import { Prisma } from '@prisma/client';
import { PfOrderType } from '../pro-financas/dto/pro-financas.types';

export class OrderTypeMapper {
  static toCreateInput(pf: PfOrderType): Omit<Prisma.OrderTypeCreateInput, 'proFinancasId'> {
    return { name: pf.nome };
  }

  static checksumFields(pf: PfOrderType): Record<string, unknown> {
    return { nome: pf.nome };
  }
}
