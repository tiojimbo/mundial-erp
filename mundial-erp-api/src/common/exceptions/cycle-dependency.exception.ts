import { ConflictException } from '@nestjs/common';

/**
 * Lancada quando uma nova `WorkItemDependency` (A -> B) criaria um ciclo
 * no grafo de dependencias (ex.: A -> B, B -> C, C -> A).
 *
 * Semantica HTTP: 409 Conflict (conflito com o estado atual do grafo).
 *
 * Ver PLANO-TASKS.md §6.1 e §8.3.
 */
export class CycleDependencyException extends ConflictException {
  constructor(path?: string) {
    super({
      message:
        path !== undefined && path.length > 0
          ? `Esta dependencia criaria um ciclo (${path}).`
          : 'Esta dependencia criaria um ciclo (A->B->C->A).',
      error: 'CycleDependency',
      code: 'CYCLE_DEPENDENCY',
    });
  }
}
