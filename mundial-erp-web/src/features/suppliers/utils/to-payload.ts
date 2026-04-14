import type { SupplierFormData } from '../schemas/supplier.schema';
import type { CreateSupplierPayload } from '../types/supplier.types';

export function toSupplierPayload(data: SupplierFormData): CreateSupplierPayload {
  return {
    personType: data.personType,
    cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
    name: data.name,
    tradeName: data.tradeName || undefined,
    ie: data.ie || undefined,
    email: data.email || undefined,
    phone: data.phone || undefined,
    address: data.address || undefined,
    city: data.city || undefined,
    state: data.state || undefined,
    zipCode: data.zipCode || undefined,
    isActive: data.isActive,
  };
}
