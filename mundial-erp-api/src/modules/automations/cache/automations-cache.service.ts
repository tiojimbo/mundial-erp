import { Injectable } from '@nestjs/common';
import { Automation, AutomationTrigger } from '@prisma/client';

const TTL_MS = 30_000;

interface Entry {
  data: Automation[];
  expiresAt: number;
}

@Injectable()
export class AutomationsCacheService {
  private readonly store = new Map<string, Entry>();

  async getOrLoad(
    workspaceId: string,
    trigger: AutomationTrigger,
    loader: () => Promise<Automation[]>,
  ): Promise<Automation[]> {
    const key = this.key(workspaceId, trigger);
    const cached = this.store.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
    const data = await loader();
    this.store.set(key, { data, expiresAt: now + TTL_MS });
    return data;
  }

  invalidateWorkspace(workspaceId: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(`${workspaceId}:`)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  private key(workspaceId: string, trigger: AutomationTrigger): string {
    return `${workspaceId}:${trigger}`;
  }
}
