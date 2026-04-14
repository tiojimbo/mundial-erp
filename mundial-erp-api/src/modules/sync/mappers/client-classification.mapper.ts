import { Prisma } from '@prisma/client';
import { PfClientClassification } from '../pro-financas/dto/pro-financas.types';

export class ClientClassificationMapper {
  static toCreateInput(
    pf: PfClientClassification,
  ): Omit<Prisma.ClientClassificationCreateInput, 'proFinancasId'> {
    return { name: pf.nome };
  }

  static checksumFields(pf: PfClientClassification): Record<string, unknown> {
    return { nome: pf.nome };
  }
}
