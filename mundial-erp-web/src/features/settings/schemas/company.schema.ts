import { z } from 'zod';

export const companySchema = z.object({
  name: z.string().min(1, 'Nome da empresa é obrigatório'),
  tradeName: z.string().optional(),
  cnpj: z.string().min(14, 'CNPJ é obrigatório'),
  ie: z.string().optional(),
  im: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  website: z.string().optional(),
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  neighborhood: z.string().optional(),
  complement: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  description: z.string().max(200, 'Máximo de 200 caracteres').optional(),
});

export type CompanyFormData = z.infer<typeof companySchema>;
