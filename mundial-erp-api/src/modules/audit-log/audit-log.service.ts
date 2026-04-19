import { Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditLogRepository } from './audit-log.repository';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly repository: AuditLogRepository) {}

  /** Fire-and-forget audit logging — never throws */
  log(data: {
    userId?: string;
    action: AuditAction;
    entity: string;
    entityId: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    this.repository.create(data).catch((error: Error) => {
      this.logger.error(
        `Failed to write audit log: ${error.message}`,
        JSON.stringify({
          entity: data.entity,
          entityId: data.entityId,
          action: data.action,
        }),
      );
    });
  }

  async findAll(dto: QueryAuditLogDto) {
    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);

    const result = await this.repository.findMany({
      skip,
      take: dto.limit ?? 20,
      entity: dto.entity,
      entityId: dto.entityId,
      userId: dto.userId,
      action: dto.action,
      dateFrom: dto.dateFrom ? new Date(dto.dateFrom) : undefined,
      dateTo: dto.dateTo ? new Date(dto.dateTo) : undefined,
    });

    return {
      items: result.items,
      pagination: {
        page: dto.page ?? 1,
        limit: dto.limit ?? 20,
        total: result.total,
        totalPages: Math.ceil(result.total / (dto.limit ?? 20)),
      },
    };
  }

  async findByEntity(entity: string, entityId: string) {
    return this.repository.findByEntity(entity, entityId);
  }
}
