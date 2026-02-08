import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { title, message, type, link } = body

        // 1. Find all admins
        const admins = await prisma.user.findMany({
            where: {
                role: 'ADMIN'
            },
            select: {
                id: true
            }
        })

        if (admins.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No admins found to notify",
                count: 0
            })
        }

        // 2. Create notification for each admin
        // Prisma createMany doesn't support connections/relations in some DBs or generic usage easily with filtered relations without foreign keys setup in a specific way,
        // but for simple models it works. However, 'userId' is a relation.
        // It's safer to use a transaction or just Promise.all for safety with SQLite/Postgres/MySQL differences in Prisma.
        // Actually createMany is supported in MySQL.

        const notificationsData = admins.map(admin => ({
            userId: admin.id,
            title,
            message,
            type: type || 'INFO',
            link: link || null,
            isRead: false
        }))

        const result = await prisma.notification.createMany({
            data: notificationsData
        })

        return NextResponse.json({
            success: true,
            data: result,
            count: result.count
        }, { status: 201 })

    } catch (error) {
        console.error('Error sending admin notifications:', error)
        return NextResponse.json(
            { success: false, error: "Failed to send notifications" },
            { status: 500 }
        )
    }
}
