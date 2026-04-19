import { Prisma } from '@prisma/client';
import { PfPaymentMethod } from '../pro-financas/dto/pro-financas.types';

export class PaymentMethodMapper {
  static toCreateInput(
    pf: PfPaymentMethod,
  ): Omit<Prisma.PaymentMethodCreateInput, 'proFinancasId'> {
    return {
      name: pf.nome,
      isActive: pf.ativo !== false,
    };
  }

  static checksumFields(pf: PfPaymentMethod): Record<string, unknown> {
    return { nome: pf.nome, ativo: pf.ativo };
  }
}
