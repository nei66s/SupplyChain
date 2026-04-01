import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('sc-session')?.value;
    const { pathname } = request.nextUrl;

    // 1. If at /login and already have a token, go to dashboard or the redirect param
    if (pathname === '/login' && token) {
        const defaultRedirect = '/dashboard';
        const redirectUrl = request.nextUrl.searchParams.get('redirect') || defaultRedirect;
        return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // 2. Protected paths check
    const protectedPaths = [
        '/dashboard',
        '/orders',
        '/inventory',
        '/materials',
        '/production',
        '/report',
        '/picking',
        '/admin',
        '/profile',
        '/platform',
    ];

    const isProtected = protectedPaths.some(path => pathname.startsWith(path)) && !pathname.startsWith('/platform-login');

    if (isProtected && !token) {
        const loginRoute = pathname.startsWith('/platform') ? '/platform-login' : '/login';
        const url = new URL(loginRoute, request.url);
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (static files)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
};
