import { Injectable } from '@nestjs/common';
import { AutomationsRepository } from './automations.repository';
import { TRIGGERS_CATALOG } from './catalog/triggers.catalog';
import { TriggerDef } from './catalog/types';

@Injectable()
export class AutomationsService {
  constructor(private readonly repository: AutomationsRepository) {}

  listTriggers(): TriggerDef[] {
    return [...TRIGGERS_CATALOG];
  }
}
