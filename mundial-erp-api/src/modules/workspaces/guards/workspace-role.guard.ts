import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { WorkspaceMemberRole } from '@prisma/client';
import { IS_PUBLIC_KEY, WORKSPACE_ROLES_KEY } from '../../auth/decorators';

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  private readonly multiWorkspaceEnabled: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    this.multiWorkspaceEnabled =
      this.config.get<boolean>('featureFlags.multiWorkspaceEnabled') ?? false;
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.multiWorkspaceEnabled) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<
      WorkspaceMemberRole[]
    >(WORKSPACE_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{
      user?: { workspaceRole?: WorkspaceMemberRole };
    }>();

    if (user?.workspaceRole && requiredRoles.includes(user.workspaceRole)) {
      return true;
    }

    throw new ForbiddenException(
      'Permissao de workspace insuficiente para esta acao',
    );
  }
}
