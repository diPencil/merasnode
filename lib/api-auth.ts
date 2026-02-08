import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt'
import { prisma } from './db'

export interface AuthenticatedRequest extends NextRequest {
    user?: JWTPayload & { isActive: boolean }
}

/**
 * Authenticate API request
 * Returns user payload if authenticated, null otherwise
 */
export async function authenticateRequest(request: NextRequest): Promise<JWTPayload | null> {
    try {
        const authHeader = request.headers.get('authorization')
        const token = extractTokenFromHeader(authHeader)
        
        if (!token) {
            return null
        }
        
        const payload = verifyToken(token)
        if (!payload) {
            return null
        }
        
        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, isActive: true }
        })
        
        if (!user || !user.isActive) {
            return null
        }
        
        return payload
    } catch (error) {
        console.error('Authentication error:', error)
        return null
    }
}

/**
 * Middleware helper to require authentication
 * Usage: const user = await requireAuth(request)
 */
export async function requireAuth(request: NextRequest): Promise<JWTPayload> {
    const user = await authenticateRequest(request)
    
    if (!user) {
        throw new Error('Unauthorized')
    }
    
    return user
}

/**
 * Check if user has required role
 */
export function hasRole(user: JWTPayload, allowedRoles: string[]): boolean {
    return allowedRoles.includes(user.role)
}

/**
 * Middleware helper to require specific role
 */
export async function requireRole(
    request: NextRequest,
    allowedRoles: string[]
): Promise<JWTPayload> {
    const user = await requireAuth(request)
    
    if (!hasRole(user, allowedRoles)) {
        throw new Error('Forbidden')
    }
    
    return user
}

/**
 * Error response helper for authentication failures
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
    return NextResponse.json(
        { success: false, error: message },
        { status: 401 }
    )
}

/**
 * Error response helper for authorization failures
 */
export function forbiddenResponse(message: string = 'Forbidden') {
    return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
    )
}

/**
 * Wrapper function for protected API routes
 * Automatically handles authentication and error responses
 */
export function withAuth(
    handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse>
) {
    return async (request: NextRequest) => {
        try {
            const user = await requireAuth(request)
            return await handler(request, user)
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Unauthorized') {
                    return unauthorizedResponse()
                }
                if (error.message === 'Forbidden') {
                    return forbiddenResponse()
                }
            }
            
            return NextResponse.json(
                { success: false, error: 'Internal server error' },
                { status: 500 }
            )
        }
    }
}

/**
 * Wrapper function for role-protected API routes
 */
export function withRole(
    allowedRoles: string[],
    handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse>
) {
    return async (request: NextRequest) => {
        try {
            const user = await requireRole(request, allowedRoles)
            return await handler(request, user)
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Unauthorized') {
                    return unauthorizedResponse()
                }
                if (error.message === 'Forbidden') {
                    return forbiddenResponse('You do not have permission to access this resource')
                }
            }
            
            return NextResponse.json(
                { success: false, error: 'Internal server error' },
                { status: 500 }
            )
        }
    }
}
