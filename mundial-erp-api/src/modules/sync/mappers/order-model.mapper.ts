import { Prisma } from '@prisma/client';
import { PfOrderModel } from '../pro-financas/dto/pro-financas.types';

export class OrderModelMapper {
  static toCreateInput(
    pf: PfOrderModel,
  ): Omit<Prisma.OrderModelCreateInput, 'proFinancasId'> {
    return { name: pf.nome };
  }

  static checksumFields(pf: PfOrderModel): Record<string, unknown> {
    return { nome: pf.nome };
  }
}
