import { z } from 'zod';

export const dashboardSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(120),
  description: z.string().max(500).optional().or(z.literal('')),
  isPublic: z.boolean().optional(),
});

export type DashboardFormData = z.infer<typeof dashboardSchema>;

export const cardSchema = z.object({
  type: z.enum([
    'KPI_NUMBER',
    'BAR_CHART',
    'LINE_CHART',
    'PIE_CHART',
    'DONUT',
    'AREA_CHART',
    'STACKED_BAR',
    'TABLE',
  ]),
  title: z.string().min(1, 'Título é obrigatório').max(120),
  dataSource: z.object({
    entity: z.string().min(1, 'Selecione uma entidade'),
    processId: z.string().optional(),
    departmentId: z.string().optional(),
    statusFilter: z.string().optional(),
    dateRange: z.object({
      from: z.string(),
      to: z.string(),
    }).optional(),
  }),
  axisConfig: z.object({
    xField: z.string().min(1),
    yField: z.string().min(1),
    groupBy: z.string().optional(),
  }).optional(),
});

export type CardFormData = z.infer<typeof cardSchema>;
