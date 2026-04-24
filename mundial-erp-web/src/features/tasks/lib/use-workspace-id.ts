import { useWorkspaceStore } from '@/stores/workspace.store';

/**
 * Hook interno da feature Tasks para extrair `workspaceId` corrente.
 *
 * Centralizar aqui facilita testes (mock unico) e evita espalhar
 * acoplamento com `useWorkspaceStore` em dezenas de hooks.
 *
 * Retorna string vazia quando nao ha workspace ativo — queries devem
 * se proteger com `enabled: Boolean(workspaceId) && ...`.
 */
export function useWorkspaceId(): string {
  const workspace = useWorkspaceStore((state) => state.currentWorkspace);
  return workspace?.id ?? '';
}
