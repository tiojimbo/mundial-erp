export type StatusCategory = 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';

export const PALETTE = [
  '#6B21A8','#4338CA','#2563EB','#0F766E','#10B981','#22C55E','#FACC15','#F97316',
  '#DC2626','#DB2777','#9333EA','#92400E','#525252','#737373','#A3A3A3',
] as const;

export type PaletteColor = (typeof PALETTE)[number];

export interface StatusGroupConfig {
  key: StatusCategory;
  label: string;
  tip: string;
  canAdd: boolean;
}

export const GROUPS: ReadonlyArray<StatusGroupConfig> = [
  { key: 'NOT_STARTED', label: 'Not started', tip: 'Tarefas que ainda nao foram iniciadas', canAdd: true },
  { key: 'ACTIVE',      label: 'Active',      tip: 'Tarefas que estao em andamento',       canAdd: true },
  { key: 'DONE',        label: 'Done',        tip: 'Tarefas que foram concluidas',         canAdd: true },
  { key: 'CLOSED',      label: 'Closed',      tip: 'Tarefas que foram fechadas',           canAdd: false },
];

export const DEFAULT_NEW_STATUS_COLOR = PALETTE[5];
