import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../auth/decorators';
import type { JwtPayload } from '../../auth/decorators';
import { UsersRepository } from '../../users/users.repository';
import { PersonalAccessTokensRepository } from '../personal-access-tokens.repository';
import { PersonalAccessTokensService } from '../personal-access-tokens.service';
import { REQUIRE_JWT_KEY } from '../decorators/require-jwt.decorator';

const TOUCH_INTERVAL_MS = 60_000;
const touchCache = new Map<string, number>();

@Injectable()
export class JwtOrPkAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly repository: PersonalAccessTokensRepository,
    private readonly tokensService: PersonalAccessTokensService,
    private readonly usersRepository: UsersRepository,
  ) {
    super();
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const header = request.headers?.authorization;
    const token = this.extractBearer(
      typeof header === 'string' ? header : undefined,
    );

    if (token?.startsWith('pk_')) {
      const requireJwt = this.reflector.getAllAndOverride<boolean>(
        REQUIRE_JWT_KEY,
        [ctx.getHandler(), ctx.getClass()],
      );
      if (requireJwt) {
        throw new ForbiddenException('Esta rota nao aceita API key');
      }
      return this.validatePk(request, token);
    }

    return (await super.canActivate(ctx)) as boolean;
  }

  private extractBearer(header: string | undefined): string | null {
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
    return value.trim() || null;
  }

  private async validatePk(
    request: Request & { user?: JwtPayload },
    token: string,
  ): Promise<boolean> {
    const tokenHash = this.tokensService.hash(token);
    const pk = await this.repository.findActiveByHash(tokenHash);
    if (!pk) {
      throw new UnauthorizedException('API key invalida ou revogada');
    }
    if (pk.expiresAt && pk.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expirada');
    }

    const user = await this.usersRepository.findById(pk.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario inativo');
    }

    request.user = {
      sub: user.id,
      email: user.email,
      role: user.role,
      workspaceId: pk.workspaceId,
      workspaceRole: undefined,
    };

    void this.touchLastUsed(pk.id);
    return true;
  }

  private async touchLastUsed(id: string): Promise<void> {
    const now = Date.now();
    const last = touchCache.get(id);
    if (last && now - last < TOUCH_INTERVAL_MS) return;
    touchCache.set(id, now);
    try {
      await this.repository.touchLastUsed(id);
    } catch {
      touchCache.delete(id);
    }
  }
}
