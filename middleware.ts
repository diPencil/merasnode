import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login', '/api/auth/init-admin']

// Routes that should redirect to dashboard if already logged in
const authRoutes = ['/login']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next()
    }

    // Check for auth session in cookies or headers
    // Since we're using localStorage, we can't check it server-side
    // So we'll redirect to login and let the client-side handle it

    // For now, just allow all routes
    // The client-side will handle redirects via useEffect
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)',
    ],
}
