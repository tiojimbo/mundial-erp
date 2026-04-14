import { z } from 'zod';

export const registerPaymentSchema = z.object({
  paidAmountCents: z
    .number({ required_error: 'Valor é obrigatório' })
    .min(1, 'Valor deve ser maior que zero'),
  paidDate: z.string().optional(),
});

export type RegisterPaymentFormData = z.infer<typeof registerPaymentSchema>;

export const createARSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  orderId: z.string().optional().or(z.literal('')),
  description: z
    .string()
    .min(3, 'Descrição deve ter no mínimo 3 caracteres')
    .max(255, 'Descrição deve ter no máximo 255 caracteres'),
  amountCents: z
    .number({ required_error: 'Valor é obrigatório' })
    .min(1, 'Valor deve ser maior que zero'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  invoiceId: z.string().optional().or(z.literal('')),
});

export type CreateARFormData = z.infer<typeof createARSchema>;

export const createAPSchema = z.object({
  supplierId: z.string().optional().or(z.literal('')),
  description: z
    .string()
    .min(3, 'Descrição deve ter no mínimo 3 caracteres')
    .max(255, 'Descrição deve ter no máximo 255 caracteres'),
  amountCents: z
    .number({ required_error: 'Valor é obrigatório' })
    .min(1, 'Valor deve ser maior que zero'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  categoryId: z.string().optional().or(z.literal('')),
});

export type CreateAPFormData = z.infer<typeof createAPSchema>;

export const openCashRegisterSchema = z.object({
  companyId: z.string().min(1, 'Empresa é obrigatória'),
  openingBalanceCents: z
    .number({ required_error: 'Saldo inicial é obrigatório' })
    .min(0, 'Saldo não pode ser negativo'),
});

export type OpenCashRegisterFormData = z.infer<typeof openCashRegisterSchema>;

export const closeCashRegisterSchema = z.object({
  closingBalanceCents: z
    .number({ required_error: 'Saldo final é obrigatório' })
    .min(0, 'Saldo não pode ser negativo'),
});

export type CloseCashRegisterFormData = z.infer<typeof closeCashRegisterSchema>;
