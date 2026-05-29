import { StatusType } from '@prisma/client';

export interface StatusLite {
  id: string;
  name: string;
  type: StatusType;
  position: number;
}

export interface StatusMapEntry {
  sourceStatusId: string;
  sourceName: string;
  sourceType: StatusType;
  autoTargetStatusId: string | null;
  autoTargetName: string | null;
}

/**
 * Mapeia cada status de origem para o status equivalente na esteira de destino
 * por TYPE + POSICAO (nunca por nome) — paridade Hoppe. Para cada source pega o
 * status de destino do mesmo `type` com menor `position`. Sem equivalente de
 * type -> `autoTargetStatusId: null` (o caller marca needsReconciliation).
 */
export function autoMapStatuses(
  sources: StatusLite[],
  targets: StatusLite[],
): StatusMapEntry[] {
  const byType = new Map<StatusType, StatusLite[]>();
  for (const t of targets) {
    const arr = byType.get(t.type);
    if (arr) arr.push(t);
    else byType.set(t.type, [t]);
  }
  for (const arr of byType.values()) {
    arr.sort((a, b) => a.position - b.position);
  }

  return sources.map((s) => {
    const candidate = byType.get(s.type)?.[0] ?? null;
    return {
      sourceStatusId: s.id,
      sourceName: s.name,
      sourceType: s.type,
      autoTargetStatusId: candidate?.id ?? null,
      autoTargetName: candidate?.name ?? null,
    };
  });
}
