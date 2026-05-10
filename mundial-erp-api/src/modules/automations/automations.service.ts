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

  async listStatusesByScope(workspaceId: string) {
    const rows = await this.repository.listWorkflowStatusesByScope(workspaceId);

    const spaceMap = new Map<
      string,
      { id: string; name: string; statuses: typeof rows }
    >();
    const folderMap = new Map<
      string,
      {
        id: string;
        name: string;
        spaceId: string;
        statuses: typeof rows;
      }
    >();

    for (const row of rows) {
      if (row.folderId) {
        const key = row.folderId;
        if (!folderMap.has(key) && row.folder) {
          folderMap.set(key, {
            id: row.folder.id,
            name: row.folder.name,
            spaceId: row.folder.spaceId,
            statuses: [],
          });
        }
        folderMap.get(key)!.statuses.push(row);
      } else {
        const key = row.spaceId;
        if (!spaceMap.has(key)) {
          spaceMap.set(key, {
            id: row.space.id,
            name: row.space.name,
            statuses: [],
          });
        }
        spaceMap.get(key)!.statuses.push(row);
      }
    }

    return {
      spaces: [...spaceMap.values()],
      folders: [...folderMap.values()],
    };
  }
}
