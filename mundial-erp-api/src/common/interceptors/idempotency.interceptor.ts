import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey: string | undefined = request._idempotencyKey;

    if (!idempotencyKey) return next.handle();

    const route: string = request._idempotencyRoute;

    return next.handle().pipe(
      tap(async (responseBody) => {
        const response = context.switchToHttp().getResponse();
        try {
          await this.prisma.idempotencyRecord.create({
            data: {
              key: idempotencyKey,
              route,
              statusCode: response.statusCode,
              body: responseBody ? JSON.stringify(responseBody) : null,
            },
          });
        } catch {
          // Ignore duplicate key errors (race condition)
        }
      }),
    );
  }
}
