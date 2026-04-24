/**
 * Tipos compartilhados para o editor de status (modal Editar status).
 *
 * Reexporta `WorkItemStatus` como `WorkflowStatus` (nome canônico no contexto
 * de configuração) e exporta `StatusCategory` como named type, que até então
 * era declarado inline em vários módulos.
 */
import type { WorkItemStatus } from '@/features/work-items/types/work-item.types';

export type StatusCategory = 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';

export const STATUS_CATEGORY_ORDER: StatusCategory[] = [
  'NOT_STARTED',
  'ACTIVE',
  'DONE',
  'CLOSED',
];

export const STATUS_CATEGORY_LABELS: Record<StatusCategory, string> = {
  NOT_STARTED: 'Not Started',
  ACTIVE: 'Active',
  DONE: 'Done',
  CLOSED: 'Closed',
};

/**
 * Formato do status vindo do backend (`WorkflowStatusResponseDto`).
 * Espelha `WorkItemStatus` (usado pelas views de work-items) e acrescenta
 * os campos de configuração — `sortOrder`, `departmentId`, `isDefault`.
 *
 * Observação: o backend ainda NÃO expõe `areaId` no response DTO
 * (ver `workflow-status-response.dto.ts`). Quando isso for exposto,
 * adicionar aqui o campo `areaId: string | null`.
 */
export type WorkflowStatus = WorkItemStatus & {
  sortOrder: number;
  departmentId: string;
  isDefault: boolean;
};
