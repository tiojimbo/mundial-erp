import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../database/prisma.service';
import { IS_PUBLIC_KEY } from '../../auth/decorators';
import { SKIP_WORKSPACE_GUARD_KEY } from '../decorators/skip-workspace-guard.decorator';

// Cache LRU evita bater no banco a cada request — TTL curto absorve mudanças
// de membership. Bypass total quando feature flag está OFF (vide ADR-001).
// TODO: invalidar via evento (member.removed / role.updated / workspace.deleted).
type CacheEntry = { ts: number; ok: boolean };

const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 10_000;
const CACHE_CLEANUP_THRESHOLD = 12_000;

@Injectable()
export class WorkspaceGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(WorkspaceGuard.name);
  private readonly multiWorkspaceEnabled: boolean;
  private readonly membershipCache = new Map<string, CacheEntry>();

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.multiWorkspaceEnabled =
      this.config.get<boolean>('featureFlags.multiWorkspaceEnabled') ?? false;
  }

  onModuleInit(): void {
    if (this.multiWorkspaceEnabled) {
      this.logger.log(
        'WorkspaceGuard ENABLED — multi-tenancy enforcement ATIVO (JWT.workspaceId + membership ativa).',
      );
      this.logger.log(
        `WorkspaceGuard cache: in-memory Map (TTL ${CACHE_TTL_MS}ms, max ${CACHE_MAX_ENTRIES} entries). Redis indisponivel — usando fallback local.`,
      );
    } else {
      this.logger.warn(
        'WorkspaceGuard BYPASS — MULTI_WORKSPACE_ENABLED=false. Sistema em modo single-tenant legado, NENHUMA validacao de workspace sera aplicada. Vide ADR-001.',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Bypass total quando a flag esta desligada — rollback seguro sem reverter
    // migration. Mantem o sistema em modo single-tenant (Fase 1 nullable).
    if (!this.multiWorkspaceEnabled) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skipWorkspace = this.reflector.getAllAndOverride<boolean>(
      SKIP_WORKSPACE_GUARD_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipWorkspace) return true;

    const request = context.switchToHttp().getRequest<{
      user?: { sub?: string; workspaceId?: string };
    }>();
    const user = request.user;
    if (!user?.sub || !user?.workspaceId) {
      throw new ForbiddenException(
        'Workspace nao selecionado — chame POST /workspaces/:id/select',
      );
    }

    const cacheKey = `wsguard:${user.sub}:${user.workspaceId}`;
    const cached = this.getCached(cacheKey);
    if (cached !== null) {
      if (cached) return true;
      throw new ForbiddenException(
        'Usuario nao e membro deste workspace ou workspace foi removido',
      );
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: user.workspaceId,
          userId: user.sub,
        },
      },
      select: { id: true, workspace: { select: { deletedAt: true } } },
    });

    const ok = !!member && member.workspace.deletedAt === null;
    this.setCached(cacheKey, ok);

    if (!ok) {
      throw new ForbiddenException(
        'Usuario nao e membro deste workspace ou workspace foi removido',
      );
    }

    return true;
  }

  private getCached(key: string): boolean | null {
    const entry = this.membershipCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      this.membershipCache.delete(key);
      return null;
    }
    return entry.ok;
  }

  private setCached(key: string, ok: boolean): void {
    // LRU aproximado via ordem de inserção do Map.
    if (this.membershipCache.size >= CACHE_CLEANUP_THRESHOLD) {
      this.evictExpired();
      if (this.membershipCache.size >= CACHE_MAX_ENTRIES) {
        const overflow = this.membershipCache.size - CACHE_MAX_ENTRIES + 1;
        let i = 0;
        for (const k of this.membershipCache.keys()) {
          if (i++ >= overflow) break;
          this.membershipCache.delete(k);
        }
      }
    }
    this.membershipCache.set(key, { ts: Date.now(), ok });
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [k, v] of this.membershipCache.entries()) {
      if (now - v.ts > CACHE_TTL_MS) {
        this.membershipCache.delete(k);
      }
    }
  }
}
