import { Prisma } from '@prisma/client';
import { PfDeliveryRoute } from '../pro-financas/dto/pro-financas.types';

export class DeliveryRouteMapper {
  static toCreateInput(
    pf: PfDeliveryRoute,
  ): Omit<Prisma.DeliveryRouteCreateInput, 'proFinancasId'> {
    return { name: pf.nome };
  }

  static checksumFields(pf: PfDeliveryRoute): Record<string, unknown> {
    return { nome: pf.nome };
  }
}
