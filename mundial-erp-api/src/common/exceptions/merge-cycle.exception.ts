import { ConflictException } from '@nestjs/common';

/**
 * Lancada quando a task alvo de um merge e descendente (subtree) de alguma
 * das tasks de origem — mover as sources para o target criaria um ciclo na
 * hierarquia parent/child.
 *
 * Semantica HTTP: 409 Conflict.
 *
 * Ver PLANO-TASKS.md §6.1 e §8.4 passo 2.
 */
export class MergeCycleException extends ConflictException {
  constructor(targetId?: string, sourceId?: string) {
    super({
      message:
        targetId !== undefined && sourceId !== undefined
          ? `A tarefa alvo do merge (${targetId}) e descendente de uma das tarefas de origem (${sourceId}).`
          : 'A tarefa alvo do merge e descendente de uma das tarefas de origem.',
      error: 'MergeCycle',
      code: 'MERGE_CYCLE',
    });
  }
}
