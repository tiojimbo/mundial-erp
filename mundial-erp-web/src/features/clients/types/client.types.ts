export type PersonType = 'F' | 'J';

export type Client = {
  id: string;
  personType: PersonType;
  cpfCnpj: string;
  name: string;
  tradeName: string | null;
  ie: string | null;
  rg: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  classificationId: string | null;
  classification: ClientClassification | null;
  deliveryRouteId: string | null;
  deliveryRoute: DeliveryRoute | null;
  defaultPriceTableId: string | null;
  defaultPaymentMethodId: string | null;
  proFinancasId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientClassification = {
  id: string;
  name: string;
  proFinancasId: number | null;
};

export type DeliveryRoute = {
  id: string;
  name: string;
  proFinancasId: number | null;
};

export type CreateClientPayload = {
  personType: PersonType;
  cpfCnpj: string;
  name: string;
  tradeName?: string;
  ie?: string;
  rg?: string;
  email?: string;
  phone?: string;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  complement?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  classificationId?: string;
  deliveryRouteId?: string;
  defaultPriceTableId?: string;
  defaultPaymentMethodId?: string;
};

export type UpdateClientPayload = Partial<CreateClientPayload>;

export type ClientFilters = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type ClientOrderSummary = {
  id: string;
  orderNumber: string;
  title: string | null;
  status: string;
  totalCents: number;
  paidAmountCents: number;
  createdAt: string;
  deliveryDeadline: string | null;
};

export type ClientFinancialSummary = {
  totalAmountCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  totalOverdueCents: number;
  countTotal: number;
  countPending: number;
  countOverdue: number;
  countPaid: number;
};
