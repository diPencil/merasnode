import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { updateUserSchema, validateBody } from "@/lib/validations"
import {
    requireAuthWithScope,
    requireRoleWithScope,
    requireDeleteAllowed,
    unauthorizedResponse,
    forbiddenResponse,
} from "@/lib/api-auth"

// GET - Fetch a single user (auth + scope check)
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        const params = await props.params
        const { id } = params

        // Users can always view their own profile
        // ADMIN can view anyone
        // SUPERVISOR can view users in their branches
        // AGENT can only view themselves
        if (id !== scope.userId) {
            if (scope.role === 'AGENT') {
                return forbiddenResponse('Agents can only view their own profile')
            }
            if (scope.role === 'SUPERVISOR') {
                // Verify the target user shares at least one branch with the supervisor
                const targetUser = await prisma.user.findUnique({
                    where: { id },
                    select: { branches: { select: { id: true } } },
                })
                if (!targetUser) {
                    return NextResponse.json(
                        { success: false, error: "User not found" },
                        { status: 404 }
                    )
                }
                const sharedBranch = targetUser.branches.some(b => scope.branchIds.includes(b.id))
                if (!sharedBranch) {
                    return NextResponse.json(
                        { success: false, error: "User not found" },
                        { status: 404 }
                    )
                }
            }
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                branches: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        phone: true,
                        email: true,
                        isActive: true,
                    },
                },
                whatsappAccounts: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        status: true,
                    },
                },
            },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, data: user })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse()
        }
        console.error("Error fetching user:", error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch user" },
            { status: 500 }
        )
    }
}

// PUT - Update user (ADMIN or self-profile-edit only)
export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        const params = await props.params
        const body = await request.json()
        const { id } = params

        // Only ADMIN can edit other users' roles/branches/whatsapp assignments
        // Users can edit their own basic profile (name, email, status)
        if (id !== scope.userId && scope.role !== 'ADMIN') {
            return forbiddenResponse('Only admins can edit other users')
        }

        // Non-admin editing themselves: strip sensitive fields
        if (id === scope.userId && scope.role !== 'ADMIN') {
            delete body.role
            delete body.branchIds
            delete body.whatsappAccountIds
            delete body.isActive
        }

        const validation = validateBody(updateUserSchema, body)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 400 }
            )
        }
        const data = validation.data

        const existingUser = await prisma.user.findUnique({ where: { id } })
        if (!existingUser) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            )
        }

        // Username uniqueness check
        if (data.username != null && data.username !== '') {
            const usernameLower = data.username.trim().toLowerCase()
            const taken = await prisma.user.findFirst({
                where: { username: usernameLower, id: { not: id } }
            })
            if (taken) {
                return NextResponse.json(
                    { success: false, error: "Username is already taken" },
                    { status: 409 }
                )
            }
        }

        const user = await prisma.user.update({
            where: { id },
            data: {
                ...(data.name != null && { name: data.name }),
                ...(data.email != null && { email: data.email }),
                ...(data.username !== undefined && {
                    username: data.username === '' || data.username === null ? null : data.username.trim().toLowerCase()
                }),
                ...(data.role != null && { role: data.role }),
                ...(data.status != null && { status: data.status }),
                ...(data.branchIds && {
                    branches: { set: data.branchIds.map((bid: string) => ({ id: bid })) }
                }),
                ...(data.whatsappAccountIds && {
                    whatsappAccounts: { set: data.whatsappAccountIds.map((wid: string) => ({ id: wid })) }
                }),
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                branches: true,
                whatsappAccounts: true
            }
        })

        // Activity log
        await prisma.log.create({
            data: {
                userId: scope.userId,
                action: 'USER_UPDATED',
                entityType: 'User',
                entityId: id,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
                metadata: {
                    userName: user.name,
                    userEmail: user.email,
                    userRole: user.role,
                    updatedFields: Object.keys(body)
                }
            }
        })

        return NextResponse.json({ success: true, data: user })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse()
        }
        console.error('Error updating user:', error)
        return NextResponse.json(
            { success: false, error: "Failed to update user" },
            { status: 500 }
        )
    }
}

// DELETE - Delete user (ADMIN only; Supervisor blocked and audited)
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const { id } = params
        const existingUser = await prisma.user.findUnique({ where: { id } })
        if (!existingUser) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            )
        }
        const prevState = { name: existingUser.name, email: existingUser.email, role: existingUser.role }
        const allowed = await requireDeleteAllowed(request, "User", id, prevState)
        if (allowed instanceof NextResponse) return allowed
        const { scope } = allowed

        if (id === scope.userId) {
            return NextResponse.json(
                { success: false, error: "Cannot delete your own account" },
                { status: 400 }
            )
        }

        // Activity log before deletion
        await prisma.log.create({
            data: {
                userId: scope.userId,
                action: 'USER_DELETED',
                entityType: 'User',
                entityId: id,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
                metadata: {
                    userName: existingUser.name,
                    userEmail: existingUser.email,
                    userRole: existingUser.role
                }
            }
        })

        await prisma.user.delete({ where: { id } })

        return NextResponse.json({
            success: true,
            message: "User deleted successfully"
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse('Only admins can delete users')
        }
        console.error('Error deleting user:', error)
        return NextResponse.json(
            { success: false, error: "Failed to delete user" },
            { status: 500 }
        )
    }
}
