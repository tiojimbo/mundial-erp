import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request } from 'express';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.headers['x-request-id'] as string;

    return next.handle().pipe(
      map((data) => {
        // Detect cursor-paginated responses: { items: T[], nextCursor, hasMore }
        if (this.isCursorPaginatedResult(data)) {
          return {
            data: data.items as T,
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
              cursor: {
                next: data.nextCursor,
                hasMore: data.hasMore,
              },
            },
          };
        }

        // Detect offset-paginated responses: { items: T[], total: number }
        if (this.isPaginatedResult(data)) {
          const page = Number(request.query.page) || 1;
          const limit = Number(request.query.limit) || 20;
          const total = data.total;
          return {
            data: data.items as T,
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
              pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
              },
            },
          };
        }

        return {
          data,
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        };
      }),
    );
  }

  private isCursorPaginatedResult(
    data: unknown,
  ): data is CursorPaginatedResult<unknown> {
    return (
      data !== null &&
      typeof data === 'object' &&
      'items' in data &&
      'nextCursor' in data &&
      'hasMore' in data &&
      Array.isArray((data as CursorPaginatedResult<unknown>).items)
    );
  }

  private isPaginatedResult(data: unknown): data is PaginatedResult<unknown> {
    return (
      data !== null &&
      typeof data === 'object' &&
      'items' in data &&
      'total' in data &&
      Array.isArray((data as PaginatedResult<unknown>).items)
    );
  }
}
