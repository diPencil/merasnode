import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { title, message, type } = body

        if (!title || !message) {
            return NextResponse.json(
                { success: false, error: "Title and message are required" },
                { status: 400 }
            )
        }

        // Get all admin users
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true }
        })

        // Create notification for each admin
        await Promise.all(admins.map(admin =>
            prisma.notification.create({
                data: {
                    userId: admin.id,
                    title,
                    message,
                    type: type || 'INFO',
                    isRead: false
                }
            })
        ))

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error creating admin notifications:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create notifications' },
            { status: 500 }
        )
    }
}
