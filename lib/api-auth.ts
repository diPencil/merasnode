import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt'
import { prisma } from './db'
import { logActivity } from './logger'

export interface AuthenticatedRequest extends NextRequest {
    user?: JWTPayload & { isActive: boolean }
}

/**
 * Extended user payload that includes permission scope.
 * branchIds & whatsappAccountIds are populated from the DB
 * so every route can filter data server-side.
 */
export interface UserScope extends JWTPayload {
    branchIds: string[]
    whatsappAccountIds: string[]
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
 * Authenticate and return full permission scope (branchIds + whatsappAccountIds).
 * Returns null if authentication fails.
 */
export async function getUserWithScope(request: NextRequest): Promise<UserScope | null> {
    try {
        const authHeader = request.headers.get('authorization')
        const token = extractTokenFromHeader(authHeader)

        if (!token) return null

        const payload = verifyToken(token)
        if (!payload) return null

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                isActive: true,
                role: true,
                branches: { select: { id: true } },
                whatsappAccounts: { select: { id: true } },
            },
        })

        if (!user || !user.isActive) return null

        return {
            ...payload,
            role: user.role,                                       // always use DB role (authoritative)
            branchIds: user.branches.map((b) => b.id),
            whatsappAccountIds: user.whatsappAccounts.map((w) => w.id),
        }
    } catch (error) {
        console.error('getUserWithScope error:', error)
        return null
    }
}

/**
 * Require authentication and return full scope. Throws on failure.
 */
export async function requireAuthWithScope(request: NextRequest): Promise<UserScope> {
    const scope = await getUserWithScope(request)
    if (!scope) throw new Error('Unauthorized')
    return scope
}

/**
 * Require authentication + specific role and return full scope. Throws on failure.
 */
export async function requireRoleWithScope(
    request: NextRequest,
    allowedRoles: string[],
): Promise<UserScope> {
    const scope = await requireAuthWithScope(request)
    if (!allowedRoles.includes(scope.role)) throw new Error('Forbidden')
    return scope
}

/**
 * Build a Prisma `where` clause that limits conversations to those
 * the authenticated user is allowed to see.
 *
 * - ADMIN: no filter (sees all).
 * - SUPERVISOR: contact.branchId IN user.branchIds (assigned branches).
 * - AGENT: sees conversations for their assigned branch(s) AND (assigned to them OR has messages from their WA number).
 *          If agent has no branches but has whatsappAccountIds, show conversations with messages from their WA account(s) or assigned to them.
 */
export function buildConversationScopeFilter(scope: UserScope): Record<string, any> {
    if (scope.role === 'ADMIN') return {}

    if (scope.role === 'SUPERVISOR') {
        if (!scope.branchIds?.length) return { id: { in: [] } } // no branches => no conversations
        return {
            contact: {
                branchId: { in: scope.branchIds },
            },
        }
    }

    // AGENT: (assigned to user OR conversation has messages from user's WA accounts)
    //        AND if user has branches, contact must be in one of those branches
    const hasBranchScope = scope.branchIds && scope.branchIds.length > 0
    const hasWaScope = scope.whatsappAccountIds && scope.whatsappAccountIds.length > 0

    const agentVisibility = {
        OR: [
            { assignedToId: scope.userId },
            ...(hasWaScope
                ? [{ messages: { some: { whatsappAccountId: { in: scope.whatsappAccountIds } } } }]
                : []),
        ],
    }

    if (!hasBranchScope && !hasWaScope) {
        return { assignedToId: scope.userId }
    }
    if (!hasBranchScope) {
        return agentVisibility
    }

    return {
        AND: [
            { contact: { branchId: { in: scope.branchIds } } },
            agentVisibility,
        ],
    }
}

/**
 * Delete allowed only for ADMIN. SUPERVISOR gets 403 and attempt is audited.
 * Returns NextResponse (403) to return to client, or { scope } to proceed with delete.
 */
export async function requireDeleteAllowed(
    request: NextRequest,
    entityType: string,
    entityId?: string,
    prevState?: Record<string, unknown>
): Promise<NextResponse | { scope: UserScope }> {
    const scope = await requireAuthWithScope(request)
    if (scope.role === 'SUPERVISOR') {
        await logActivity({
            userId: scope.userId,
            action: 'DELETE_BLOCKED',
            entityType,
            entityId: entityId || null,
            oldValues: prevState || null,
            description: `Supervisor delete attempt blocked: ${entityType}${entityId ? ` ${entityId}` : ''}`,
        })
        return forbiddenResponse('Delete is not allowed for your role.')
    }
    if (scope.role !== 'ADMIN') {
        return forbiddenResponse('Only Admin can delete.')
    }
    return { scope }
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
