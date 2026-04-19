import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];

// Rotas que exigem autenticação mas não requerem workspace ativo.
// (`/workspaces/new` é o onboarding para usuários sem nenhum workspace.)
const AUTHENTICATED_NEUTRAL_PATHS = ['/workspaces/new'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isAuthenticatedNeutral = AUTHENTICATED_NEUTRAL_PATHS.some((path) =>
    pathname.startsWith(path),
  );
  const hasToken = request.cookies.get('auth_token')?.value === '1';

  if (!isPublicPath && !hasToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicPath && hasToken && !isAuthenticatedNeutral) {
    return NextResponse.redirect(new URL('/inicio', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
};
