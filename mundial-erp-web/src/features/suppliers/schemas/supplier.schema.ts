import { z } from 'zod';

function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(digits[10]);
}

function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * weights1[i];
  let remainder = sum % 11;
  const d1 = remainder < 2 ? 0 : 11 - remainder;
  if (d1 !== Number(digits[12])) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(digits[i]) * weights2[i];
  remainder = sum % 11;
  const d2 = remainder < 2 ? 0 : 11 - remainder;
  return d2 === Number(digits[13]);
}

export const supplierSchema = z
  .object({
    personType: z.enum(['F', 'J'], {
      required_error: 'Tipo de pessoa é obrigatório',
    }),
    cpfCnpj: z
      .string()
      .min(1, 'CPF/CNPJ é obrigatório'),
    name: z
      .string()
      .min(3, 'Nome deve ter no mínimo 3 caracteres')
      .max(255, 'Nome deve ter no máximo 255 caracteres'),
    tradeName: z.string().max(255).optional().or(z.literal('')),
    ie: z.string().max(20).optional().or(z.literal('')),
    email: z
      .string()
      .email('E-mail inválido')
      .optional()
      .or(z.literal('')),
    phone: z.string().max(20).optional().or(z.literal('')),
    address: z.string().max(255).optional().or(z.literal('')),
    city: z.string().max(100).optional().or(z.literal('')),
    state: z
      .string()
      .max(2)
      .optional()
      .or(z.literal('')),
    zipCode: z.string().max(10).optional().or(z.literal('')),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const digits = data.cpfCnpj.replace(/\D/g, '');
    if (data.personType === 'F') {
      if (!isValidCpf(digits)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CPF inválido',
          path: ['cpfCnpj'],
        });
      }
    } else {
      if (!isValidCnpj(digits)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CNPJ inválido',
          path: ['cpfCnpj'],
        });
      }
    }
  });

export type SupplierFormData = z.infer<typeof supplierSchema>;
