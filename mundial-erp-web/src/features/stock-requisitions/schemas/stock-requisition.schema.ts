import { z } from 'zod';

const requisitionItemSchema = z.object({
  productId: z.string().min(1, 'Produto e obrigatorio'),
  requestedQuantity: z.coerce.number().min(1, 'Quantidade minima e 1'),
  unitType: z.enum(['UN', 'CX'], { required_error: 'Selecione a unidade' }),
  unitsPerBox: z.coerce.number().min(1).optional(),
}).refine(
  (data) => data.unitType !== 'CX' || (data.unitsPerBox && data.unitsPerBox >= 1),
  { message: 'Unidades por caixa e obrigatorio para tipo CX', path: ['unitsPerBox'] },
);

export const requisitionSchema = z.object({
  type: z.enum(['VENDA', 'INTERNO'], { required_error: 'Tipo e obrigatorio' }),
  orderId: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  items: z.array(requisitionItemSchema).min(1, 'Adicione pelo menos um item'),
});

export type RequisitionFormData = z.infer<typeof requisitionSchema>;
