import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        if (scope.role !== "ADMIN") {
            return forbiddenResponse("Only Admin can assign agents to conversations")
        }
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
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        return NextResponse.json(
            { success: false, error: "Failed to assign agent" },
            { status: 500 }
        )
    }
}
