import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * JwtPayload — shape carried inside the access token e propagada via
 * `request.user` apos validacao do `JwtStrategy`.
 *
 * Os campos `workspaceId` e `workspaceRole` sao opcionais porque o usuario
 * pode estar autenticado SEM contexto de workspace selecionado (ex: logo apos
 * registro, antes de criar/aceitar convite, ou em endpoints de gestao do
 * proprio modulo workspaces marcados com `@SkipWorkspaceGuard()`).
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  workspaceId?: string;
  workspaceRole?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
