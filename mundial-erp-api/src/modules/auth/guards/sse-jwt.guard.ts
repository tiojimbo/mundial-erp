/**
 * SseJwtGuard — variante do JwtAuthGuard para endpoints SSE (`EventSource`).
 *
 * `EventSource` do browser NAO permite setar header `Authorization`, entao o
 * cliente envia o access token via query param `?token=...` (ver
 * `mundial-erp-web/src/features/tasks/lib/sse-client.ts` linhas 188-193).
 *
 * Se o header `Authorization: Bearer ...` vier presente (ex: polyfill,
 * Playwright/E2E, ou polling via Axios), ele TEM precedencia — mantem
 * compatibilidade com o fluxo normal.
 *
 * Apos validar o token, injetamos `request.user` no mesmo formato que
 * `JwtStrategy.validate` (shape `JwtPayload`) para que `@WorkspaceId()`,
 * `WorkspaceGuard` e `@CurrentUser()` downstream funcionem sem alteracao.
 *
 * Rotas anotadas com `@Public()` sao liberadas (paridade com JwtAuthGuard).
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY, type JwtPayload } from '../decorators';

function extractBearerFromHeader(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
  return value.trim() || null;
}

@Injectable()
export class SseJwtGuard implements CanActivate {
  private readonly logger = new Logger(SseJwtGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<
      Request & { user?: JwtPayload }
    >();

    // Prioridade: header Authorization, fallback para query.
    const authHeader = request.headers?.authorization;
    const headerToken = extractBearerFromHeader(
      typeof authHeader === 'string' ? authHeader : undefined,
    );
    const queryTokenRaw = request.query?.token;
    const queryToken = typeof queryTokenRaw === 'string' ? queryTokenRaw : null;
    const token = headerToken ?? queryToken;

    if (!token) {
      throw new UnauthorizedException('Token nao fornecido');
    }

    const secret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });
      request.user = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        workspaceId: payload.workspaceId,
        workspaceRole: payload.workspaceRole,
      };
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.debug(`SSE token rejeitado: ${msg}`);
      throw new UnauthorizedException('Token invalido ou expirado');
    }
  }
}
