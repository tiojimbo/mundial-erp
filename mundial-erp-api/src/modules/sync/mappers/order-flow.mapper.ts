import { Prisma } from '@prisma/client';
import { PfOrderFlow } from '../pro-financas/dto/pro-financas.types';

export class OrderFlowMapper {
  static toCreateInput(pf: PfOrderFlow): Omit<Prisma.OrderFlowCreateInput, 'proFinancasId'> {
    return { name: pf.nome };
  }

  static checksumFields(pf: PfOrderFlow): Record<string, unknown> {
    return { nome: pf.nome };
  }
}
