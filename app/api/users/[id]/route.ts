import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { updateUserSchema, validateBody } from "@/lib/validations"

// GET - جلب بيانات مستخدم واحد
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const { id } = params

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

        return NextResponse.json({
            success: true,
            data: user,
        })
    } catch (error) {
        console.error("Error fetching user:", error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch user" },
            { status: 500 }
        )
    }
}

// PUT - تحديث بيانات مستخدم
export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const body = await request.json()
        const { id } = params

        const validation = validateBody(updateUserSchema, body)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 400 }
            )
        }
        const data = validation.data

        const existingUser = await prisma.user.findUnique({
            where: { id }
        })
        if (!existingUser) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            )
        }

        // If username is being updated, check uniqueness (case-insensitive, exclude current user)
        if (data.username != null && data.username !== '') {
            const usernameLower = data.username.trim().toLowerCase()
            const taken = await prisma.user.findFirst({
                where: {
                    username: usernameLower,
                    id: { not: id }
                }
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

        // Create activity log for user update (currentUserId from raw body)
        await prisma.log.create({
            data: {
                userId: (body as { currentUserId?: string }).currentUserId || null,
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

        return NextResponse.json({
            success: true,
            data: user
        })
    } catch (error) {
        console.error('Error updating user:', error)
        return NextResponse.json(
            { success: false, error: "Failed to update user" },
            { status: 500 }
        )
    }
}

// DELETE - حذف مستخدم
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const { id } = params
        const { searchParams } = new URL(request.url)
        const currentUserId = searchParams.get('currentUserId')

        const existingUser = await prisma.user.findUnique({
            where: { id }
        })

        if (!existingUser) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            )
        }

        // Create activity log for user deletion (before deleting)
        await prisma.log.create({
            data: {
                userId: currentUserId || null,
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

        await prisma.user.delete({
            where: { id }
        })

        return NextResponse.json({
            success: true,
            message: "User deleted successfully"
        })
    } catch (error) {
        console.error('Error deleting user:', error)
        return NextResponse.json(
            { success: false, error: "Failed to delete user" },
            { status: 500 }
        )
    }
}
