import type { ClientFormData } from '../schemas/client.schema';
import type { CreateClientPayload } from '../types/client.types';

export function toClientPayload(data: ClientFormData): CreateClientPayload {
  return {
    personType: data.personType,
    cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
    name: data.name,
    tradeName: data.tradeName || undefined,
    ie: data.ie || undefined,
    rg: data.rg || undefined,
    email: data.email || undefined,
    phone: data.phone || undefined,
    address: data.address || undefined,
    addressNumber: data.addressNumber || undefined,
    neighborhood: data.neighborhood || undefined,
    complement: data.complement || undefined,
    city: data.city || undefined,
    state: data.state || undefined,
    zipCode: data.zipCode || undefined,
    classificationId: data.classificationId || undefined,
    deliveryRouteId: data.deliveryRouteId || undefined,
    defaultPriceTableId: data.defaultPriceTableId || undefined,
    defaultPaymentMethodId: data.defaultPaymentMethodId || undefined,
  };
}
