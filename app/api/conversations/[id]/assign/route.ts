import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { agentId } = body

        const conversation = await prisma.conversation.update({
            where: { id },
            data: {
                assignedToId: agentId || null
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            }
        })

        return NextResponse.json({
            success: true,
            data: conversation
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "Failed to assign agent" },
            { status: 500 }
        )
    }
}
