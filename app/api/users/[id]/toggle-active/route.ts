import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const { id } = params
        const body = await request.json()
        const { isActive, currentUserId } = body

        // Update user active status
        const user = await prisma.user.update({
            where: { id },
            data: { isActive },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        // Create activity log for activate/deactivate action
        await prisma.log.create({
            data: {
                userId: currentUserId || null,
                action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
                entityType: 'User',
                entityId: id,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
                metadata: {
                    userName: user.name,
                    userEmail: user.email,
                    userRole: user.role,
                    isActive: isActive
                }
            }
        })

        return NextResponse.json({
            success: true,
            data: user,
        })
    } catch (error) {
        console.error("Error toggling user active status:", error)
        return NextResponse.json(
            { success: false, error: "Failed to update user status" },
            { status: 500 }
        )
    }
}
