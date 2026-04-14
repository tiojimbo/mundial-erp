import { z } from 'zod';

export const accountSchema = z
  .object({
    fullName: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido'),
    currentPassword: z.string().optional(),
    password: z
      .string()
      .min(8, 'Mínimo de 8 caracteres')
      .optional()
      .or(z.literal('')),
  })
  .refine((data) => !data.password || data.currentPassword, {
    message: 'Senha atual é obrigatória para alterar a senha',
    path: ['currentPassword'],
  });

export type AccountFormData = z.infer<typeof accountSchema>;
