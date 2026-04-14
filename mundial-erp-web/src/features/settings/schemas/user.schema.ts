import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo de 8 caracteres'),
  role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'], {
    required_error: 'Perfil é obrigatório',
  }),
  department: z.string().min(1, 'Departamento é obrigatório'),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8, 'Mínimo de 8 caracteres').optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
