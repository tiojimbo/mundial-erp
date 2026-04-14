import type { QuotationFormData } from '../schemas/quotation.schema';
import type { CreateQuotationPayload } from '../types/quotation.types';

export function toQuotationPayload(data: QuotationFormData): CreateQuotationPayload {
  return {
    supplierId: data.supplierId,
    notes: data.notes || undefined,
    items: data.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  };
}
