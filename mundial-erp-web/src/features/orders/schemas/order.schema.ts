import { z } from 'zod';

const orderItemSupplySchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, 'Nome do insumo e obrigatorio'),
  quantity: z.coerce.number().int().min(1).default(1),
});

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Produto e obrigatorio'),
  quantity: z.coerce.number().min(1, 'Quantidade deve ser maior que 0'),
  unitPriceCents: z.coerce.number().int().min(0, 'Preco unitario e obrigatorio'),
  discountCents: z.coerce.number().int().min(0).default(0),
  pieces: z.coerce.number().optional(),
  size: z.coerce.number().optional(),
  supplies: z.array(orderItemSupplySchema).default([]),
});

export const orderSchema = z.object({
  clientId: z.string().min(1, 'Cliente e obrigatorio'),
  title: z.string().max(255).optional().or(z.literal('')),
  paymentMethodId: z.string().optional().or(z.literal('')),
  carrierId: z.string().optional().or(z.literal('')),
  priceTableId: z.string().optional().or(z.literal('')),
  deliveryDeadline: z.string().optional().or(z.literal('')),
  proposalValidityDays: z.coerce.number().int().min(1).default(7),
  deliveryAddress: z.string().max(255).optional().or(z.literal('')),
  deliveryNeighborhood: z.string().max(100).optional().or(z.literal('')),
  deliveryCity: z.string().max(100).optional().or(z.literal('')),
  deliveryState: z.string().max(2).optional().or(z.literal('')),
  deliveryCep: z.string().max(10).optional().or(z.literal('')),
  deliveryReferencePoint: z.string().max(255).optional().or(z.literal('')),
  contactName: z.string().max(255).optional().or(z.literal('')),
  freightCents: z.coerce.number().int().min(0).default(0),
  discountCents: z.coerce.number().int().min(0).default(0),
  shouldProduce: z.boolean().default(false),
  isResale: z.boolean().default(false),
  hasTaxSubstitution: z.boolean().default(false),
  notes: z.string().max(2000).optional().or(z.literal('')),
  items: z.array(orderItemSchema).min(1, 'Adicione ao menos 1 item'),
});

export type OrderFormData = z.infer<typeof orderSchema>;
