import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/api-auth"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
    try {
        const user = await authenticateRequest(request)
        if (user) {
            await prisma.user.update({
                where: { id: user.userId },
                data: {
                    status: 'OFFLINE',
                    lastLogoutAt: new Date()
                }
            })
        }

        return NextResponse.json({
            success: true,
            message: "Logged out successfully"
        })
    } catch (error) {
        console.error('Error during logout:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Logout failed"
            },
            { status: 500 }
        )
    }
}
