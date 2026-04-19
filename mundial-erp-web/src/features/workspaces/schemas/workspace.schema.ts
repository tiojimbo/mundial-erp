import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(80, 'Máximo 80 caracteres'),
  slug: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(40, 'Máximo 40 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  logoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Formato hex inválido (#RRGGBB)')
    .optional()
    .or(z.literal('')),
});

export type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

export type UpdateWorkspaceFormData = z.infer<typeof updateWorkspaceSchema>;

export const addMemberSchema = z.object({
  userId: z.string().min(1, 'Usuário obrigatório'),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']),
});

export type AddMemberFormData = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']),
});

export type UpdateMemberRoleFormData = z.infer<typeof updateMemberRoleSchema>;

export const createInviteSchema = z.object({
  email: z.string().email('E-mail inválido').max(255, 'Máximo 255 caracteres'),
  role: z.enum(['ADMIN', 'MEMBER', 'GUEST']),
});

export type CreateInviteFormData = z.infer<typeof createInviteSchema>;
