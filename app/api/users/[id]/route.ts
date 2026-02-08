import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

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
        const params = await props.params;
        const body = await request.json()
        const { id } = params

        // التحقق من وجود المستخدم
        const existingUser = await prisma.user.findUnique({
            where: { id }
        })

        if (!existingUser) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            )
        }

        // تحديث البيانات
        const user = await prisma.user.update({
            where: { id },
            data: {
                name: body.name,
                email: body.email,
                role: body.role,
                status: body.status,
                branches: body.branchIds ? {
                    set: body.branchIds.map((id: string) => ({ id }))
                } : undefined,
                whatsappAccounts: body.whatsappAccountIds ? {
                    set: body.whatsappAccountIds.map((id: string) => ({ id }))
                } : undefined,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                branches: true,
                whatsappAccounts: true
            }
        })

        // Create activity log for user update
        await prisma.log.create({
            data: {
                userId: body.currentUserId || null,
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
