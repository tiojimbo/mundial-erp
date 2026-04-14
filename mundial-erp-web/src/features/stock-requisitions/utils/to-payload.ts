import type { RequisitionFormData } from '../schemas/stock-requisition.schema';
import type { CreateRequisitionPayload } from '../types/stock-requisition.types';

export function toRequisitionPayload(data: RequisitionFormData): CreateRequisitionPayload {
  return {
    type: data.type,
    orderId: data.orderId || undefined,
    notes: data.notes || undefined,
    items: data.items.map((item) => ({
      productId: item.productId,
      requestedQuantity: item.requestedQuantity,
      unitType: item.unitType,
      unitsPerBox: item.unitType === 'CX' ? item.unitsPerBox : undefined,
    })),
  };
}
