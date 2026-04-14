import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuditAction } from '@prisma/client';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';

const METHOD_ACTION_MAP: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PUT: AuditAction.UPDATE,
  PATCH: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

const EXCLUDED_PATHS = ['/api/v1/auth/', '/health', '/docs'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body } = request;

    // Only audit mutations
    if (!METHOD_ACTION_MAP[method]) {
      return next.handle();
    }

    // Skip auth, health, docs routes
    if (EXCLUDED_PATHS.some((path) => url.startsWith(path))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((responseData) => {
        const { entity, entityId } = this.extractEntityFromUrl(url);
        if (!entity) return;

        // Detect STATUS_CHANGE
        let action = METHOD_ACTION_MAP[method];
        if (
          (method === 'PATCH' || method === 'PUT') &&
          body &&
          typeof body === 'object' &&
          'status' in body
        ) {
          action = AuditAction.STATUS_CHANGE;
        }

        // Extract entityId from response if not in URL (e.g., POST creates)
        const resolvedEntityId =
          entityId || this.extractIdFromResponse(responseData);

        if (!resolvedEntityId) return;

        const user = (request as Request & { user?: { id: string } }).user;

        this.auditLogService.log({
          userId: user?.id,
          action,
          entity,
          entityId: resolvedEntityId,
          changes: method !== 'DELETE' ? this.sanitizeBody(body) : undefined,
          ipAddress: (request.headers['x-forwarded-for'] as string) || request.ip,
          userAgent: request.headers['user-agent'],
        });
      }),
    );
  }

  private extractEntityFromUrl(url: string): { entity: string | null; entityId: string | null } {
    // Parse: /api/v1/clients/abc123 → entity=Client, entityId=abc123
    const match = url.match(/\/api\/v1\/([a-z-]+)(?:\/([a-zA-Z0-9_-]+))?/);
    if (!match) return { entity: null, entityId: null };

    const rawSegment = match[1];
    // Convert kebab-case plural to PascalCase singular
    const entity = rawSegment
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
      .replace(/s$/, '');

    const entityId = match[2] || null;

    // Skip if entityId looks like a sub-resource keyword
    if (entityId && /^(search|count|export|batch|status)$/.test(entityId)) {
      return { entity, entityId: null };
    }

    return { entity, entityId };
  }

  private extractIdFromResponse(response: unknown): string | null {
    if (!response || typeof response !== 'object') return null;

    const data = (response as Record<string, unknown>).data;
    if (data && typeof data === 'object' && 'id' in data) {
      return (data as Record<string, unknown>).id as string;
    }

    if ('id' in response) {
      return (response as Record<string, unknown>).id as string;
    }

    return null;
  }

  private sanitizeBody(body: unknown): Record<string, unknown> | undefined {
    if (!body || typeof body !== 'object') return undefined;

    const sanitized = { ...body } as Record<string, unknown>;

    // Remove sensitive fields
    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'refreshToken', 'secret'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
