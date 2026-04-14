import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
import { Role } from '@prisma/client';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (admin only)' })
  async findAll(@Query() query: QueryAuditLogDto) {
    const result = await this.auditLogService.findAll(query);
    return {
      data: result.items,
      meta: { pagination: result.pagination },
    };
  }

  @Get('entity/:entity/:entityId')
  @ApiOperation({ summary: 'Get audit history for a specific entity' })
  async findByEntity(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    const items = await this.auditLogService.findByEntity(entity, entityId);
    return { data: items };
  }
}
