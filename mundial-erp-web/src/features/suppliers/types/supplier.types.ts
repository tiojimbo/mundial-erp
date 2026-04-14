export type PersonType = 'F' | 'J';

export type Supplier = {
  id: string;
  personType: PersonType;
  cpfCnpj: string;
  name: string;
  tradeName: string | null;
  ie: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  isActive: boolean;
  proFinancasId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSupplierPayload = {
  personType: PersonType;
  cpfCnpj: string;
  name: string;
  tradeName?: string;
  ie?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isActive?: boolean;
};

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;

export type SupplierFilters = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

export type SupplierPurchaseHistory = {
  id: string;
  type: 'QUOTATION' | 'ORDER';
  quotationId: string | null;
  orderId: string | null;
  status: string;
  totalCents: number;
  requestedAt: string | null;
  deliveryDate: string | null;
  createdAt: string;
};
