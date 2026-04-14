import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';

export const IDEMPOTENCY_KEY = 'idempotency';
export const RequireIdempotencyKey = () => SetMetadata(IDEMPOTENCY_KEY, true);

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresIdempotency = this.reflector.getAllAndOverride<boolean>(
      IDEMPOTENCY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresIdempotency) return true;

    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      throw new ConflictException(
        'Header Idempotency-Key é obrigatório para esta operação',
      );
    }

    const route = `${request.method} ${request.route?.path || request.url}`;

    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey },
    });

    if (existing) {
      if (existing.route !== route) {
        throw new ConflictException(
          'Idempotency-Key já utilizada em outra operação',
        );
      }

      const response = context.switchToHttp().getResponse();
      response.status(existing.statusCode);
      response.json(existing.body ? JSON.parse(existing.body) : null);
      return false;
    }

    // Store key reference on request for later use by interceptor
    request._idempotencyKey = idempotencyKey;
    request._idempotencyRoute = route;

    return true;
  }
}
