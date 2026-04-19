import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Resolves the active `workspaceId` from `request.user` (populated by JwtStrategy).
 * Throws if no workspace is bound to the current JWT — controllers that opt-in
 * to this decorator MUST be protected by WorkspaceGuard or the equivalent.
 */
export const WorkspaceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const workspaceId = request.user?.workspaceId;
    if (!workspaceId) {
      throw new UnauthorizedException(
        'Workspace context missing in JWT — select a workspace first.',
      );
    }
    return workspaceId;
  },
);
