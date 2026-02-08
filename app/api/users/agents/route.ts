import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
    try {
        const agents = await prisma.user.findMany({
            where: {
                role: { in: ['AGENT', 'ADMIN', 'SUPERVISOR'] },
                isActive: true
            },
            select: {
                id: true,
                name: true,
                role: true
            }
        })

        return NextResponse.json({
            success: true,
            data: agents
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "Failed to fetch agents" },
            { status: 500 }
        )
    }
}
