import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ActionId, ACTION_IDS } from '../catalog/actions.catalog';
import type { TaskEventContext } from '../events/task-events.types';

export interface ActionInvocation {
  type: string;
  params: Record<string, unknown>;
}

export interface ActionResult {
  type: string;
  status: 'ok' | 'skipped' | 'not_implemented' | 'error';
  message?: string;
}

const ACTION_ID_SET = new Set<string>(ACTION_IDS);

@Injectable()
export class ActionRunnerService {
  private readonly logger = new Logger(ActionRunnerService.name);

  async run(
    action: ActionInvocation,
    context: TaskEventContext,
  ): Promise<ActionResult> {
    if (!ACTION_ID_SET.has(action.type)) {
      throw new NotImplementedException(`Action desconhecida: ${action.type}`);
    }
    const handler = this.resolve(action.type as ActionId);
    return handler(action.params, context);
  }

  // HPP-108 substitui o switch pelos handlers reais. Por ora retornamos
  // not_implemented com mensagem padronizada — engine ja pode rodar
  // sem precisar de cada action concreta.
  private resolve(
    actionId: ActionId,
  ): (
    params: Record<string, unknown>,
    ctx: TaskEventContext,
  ) => Promise<ActionResult> {
    return async () => ({
      type: actionId,
      status: 'not_implemented',
      message: `Action ${actionId} ainda nao implementada (HPP-108)`,
    });
  }
}
