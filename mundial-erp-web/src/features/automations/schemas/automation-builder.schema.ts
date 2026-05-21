import { z } from 'zod';

export const SCOPE_TYPE_VALUES = [
  'WORKSPACE',
  'SPACE',
  'FOLDER',
  'LIST',
] as const;

export const BR_TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Bahia',
  'America/Belem',
  'America/Boa_Vista',
  'America/Cuiaba',
  'America/Fortaleza',
  'America/Maceio',
  'America/Noronha',
  'America/Porto_Velho',
  'America/Recife',
  'America/Rio_Branco',
] as const;

export const automationBuilderSchema = z
  .object({
    name: z.string().trim().min(1, 'Obrigatório'),
    description: z.string().optional(),
    trigger: z.string().min(1, 'Selecione um gatilho'),
    cronExpression: z.string().optional(),
    timezone: z.string().optional(),
    scopeType: z.enum(SCOPE_TYPE_VALUES),
    scopeId: z.string().optional(),
    actions: z
      .array(
        z.object({
          type: z.string().min(1, 'Selecione uma ação'),
          params: z.record(z.string(), z.unknown()),
        }),
      )
      .min(1, 'Adicione ao menos uma ação'),
  })
  .superRefine((data, ctx) => {
    if (data.trigger === 'CRON' && !data.cronExpression?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['cronExpression'],
        message: 'cronExpression obrigatório para trigger CRON',
      });
    }
    if (data.scopeType !== 'WORKSPACE' && !data.scopeId) {
      ctx.addIssue({
        code: 'custom',
        path: ['scopeId'],
        message: 'scopeId obrigatório quando scopeType ≠ WORKSPACE',
      });
    }
  });

export type AutomationBuilderFormData = z.infer<typeof automationBuilderSchema>;
