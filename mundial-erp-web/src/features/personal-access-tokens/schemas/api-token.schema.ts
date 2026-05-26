import { z } from 'zod';

export const createApiTokenSchema = z.object({
  name: z
    .string()
    .min(1, 'Informe um nome')
    .max(120, 'Máximo 120 caracteres'),
});

export type CreateApiTokenFormData = z.infer<typeof createApiTokenSchema>;
