export type PriceTable = {
  id: string;
  name: string;
  isDefault: boolean;
  proFinancasId: number | null;
  items: PriceTableItem[];
  createdAt: string;
  updatedAt: string;
};

export type PriceTableItem = {
  id: string;
  priceTableId: string;
  productId: string;
  product?: { id: string; name: string; code: string };
  priceInCents: number;
};

export type CreatePriceTablePayload = {
  name: string;
  isDefault?: boolean;
};

export type UpdatePriceTablePayload = {
  name?: string;
  isDefault?: boolean;
};

export type UpdatePriceTableItemPayload = {
  productId: string;
  priceInCents: number;
};

export type CreatePriceTableItemPayload = {
  productId: string;
  priceInCents: number;
};
