import { z } from 'zod';

const quotationItemSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório'),
  quantity: z.coerce.number().min(1, 'Quantidade mínima é 1'),
});

export const quotationSchema = z.object({
  supplierId: z.string().min(1, 'Fornecedor é obrigatório'),
  notes: z.string().optional().or(z.literal('')),
  items: z.array(quotationItemSchema).min(1, 'Adicione pelo menos um item'),
});

export type QuotationFormData = z.infer<typeof quotationSchema>;
