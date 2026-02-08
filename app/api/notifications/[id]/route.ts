import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Standard Next.js 15 async params
) {
    try {
        const { id } = await params
        await prisma.notification.delete({
            where: { id }
        })

        return NextResponse.json({
            success: true,
            message: "Notification deleted"
        })
    } catch (error) {
        console.error('Error deleting notification:', error)
        return NextResponse.json(
            { success: false, error: "Failed to delete notification" },
            { status: 500 }
        )
    }
}
