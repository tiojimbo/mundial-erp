import { Injectable } from '@nestjs/common';
import { AutomationsRepository } from './automations.repository';
import { TRIGGERS_CATALOG } from './catalog/triggers.catalog';
import { ACTIONS_CATALOG } from './catalog/actions.catalog';
import { ActionDef, TriggerDef } from './catalog/types';

@Injectable()
export class AutomationsService {
  constructor(private readonly repository: AutomationsRepository) {}

  listTriggers(): TriggerDef[] {
    return [...TRIGGERS_CATALOG];
  }

  listActions(): ActionDef[] {
    return [...ACTIONS_CATALOG];
  }
}
