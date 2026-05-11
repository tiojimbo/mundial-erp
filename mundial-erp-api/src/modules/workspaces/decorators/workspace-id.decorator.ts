import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const WorkspaceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const headerRaw = request?.headers?.['workspace-id'];
    const headerValue = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
    const headerWorkspaceId =
      typeof headerValue === 'string' && headerValue.trim().length > 0
        ? headerValue.trim()
        : undefined;
    const workspaceId = headerWorkspaceId ?? request.user?.workspaceId;
    if (!workspaceId) {
      throw new UnauthorizedException(
        'Workspace context missing — send workspace-id header or select a workspace first.',
      );
    }
    return workspaceId;
  },
);
