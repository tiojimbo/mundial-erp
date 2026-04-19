// SCOPE: GLOBAL — sync Pro Finanças é single-tenant (workspace default).
// Refatorar quando 2º cliente entrar (vide ADR-001).

import { Injectable } from '@nestjs/common';
import { SyncEntity } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class SyncMappingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate MD5 checksum from key fields of a record.
   * Used for incremental sync — only updates when checksum changes.
   */
  static computeChecksum(data: Record<string, unknown>): string {
    const sorted = JSON.stringify(data, Object.keys(data).sort());
    return createHash('md5').update(sorted).digest('hex');
  }

  async findByEntityAndPfId(entity: SyncEntity, proFinancasId: number) {
    return this.prisma.syncMapping.findUnique({
      where: { entity_proFinancasId: { entity, proFinancasId } },
    });
  }

  async upsert(
    entity: SyncEntity,
    proFinancasId: number,
    mundialErpId: string,
    checksum: string,
  ) {
    return this.prisma.syncMapping.upsert({
      where: { entity_proFinancasId: { entity, proFinancasId } },
      create: {
        entity,
        proFinancasId,
        mundialErpId,
        checksum,
        lastSyncedAt: new Date(),
      },
      update: {
        mundialErpId,
        checksum,
        lastSyncedAt: new Date(),
      },
    });
  }

  /**
   * Returns true if the record has changed (checksum differs or mapping doesn't exist).
   */
  async hasChanged(
    entity: SyncEntity,
    proFinancasId: number,
    newChecksum: string,
  ): Promise<boolean> {
    const existing = await this.findByEntityAndPfId(entity, proFinancasId);
    if (!existing) return true;
    return existing.checksum !== newChecksum;
  }

  async findAllByEntity(entity: SyncEntity) {
    return this.prisma.syncMapping.findMany({ where: { entity } });
  }

  async getMundialErpId(
    entity: SyncEntity,
    proFinancasId: number,
  ): Promise<string | null> {
    const mapping = await this.findByEntityAndPfId(entity, proFinancasId);
    return mapping?.mundialErpId ?? null;
  }
}
