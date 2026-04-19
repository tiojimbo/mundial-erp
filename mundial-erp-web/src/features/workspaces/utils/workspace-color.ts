import type { Workspace, WorkspaceUI } from '../types/workspace.types';

export const WORKSPACE_COLOR_PALETTE = [
  '#D97706',
  '#2563EB',
  '#059669',
  '#DC2626',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#CA8A04',
] as const;

export function getWorkspaceInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function getWorkspaceColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return WORKSPACE_COLOR_PALETTE[Math.abs(hash) % WORKSPACE_COLOR_PALETTE.length];
}

export function toWorkspaceUI(workspace: Workspace): WorkspaceUI {
  return {
    ...workspace,
    initials: getWorkspaceInitials(workspace.name),
    bgColor: workspace.color ?? getWorkspaceColor(workspace.name),
    fgColor: '#FFFFFF',
  };
}
