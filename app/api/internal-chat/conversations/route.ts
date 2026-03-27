import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

/**
 * GET /api/internal-chat/conversations
 * List users that have at least one internal message with the current user.
 * Used for "Internal chat" list page (who can I chat with).
 */
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const myId = scope.userId

        // All messages where I'm sender or receiver
        const messages = await prisma.internalMessage.findMany({
            where: {
                OR: [{ senderId: myId }, { receiverId: myId }],
            },
            select: {
                senderId: true,
                receiverId: true,
            },
        })

        const otherIds = new Set<string>()
        for (const m of messages) {
            const other = m.senderId === myId ? m.receiverId : m.senderId
            otherIds.add(other)
        }

        if (otherIds.size === 0) {
            return NextResponse.json({ success: true, data: [] })
        }

        const users = await prisma.user.findMany({
            where: { id: { in: Array.from(otherIds) } },
            select: { id: true, name: true, email: true, status: true, role: true },
        })

        // Sort by name
        users.sort((a, b) => a.name.localeCompare(b.name, "ar"))

        return NextResponse.json({
            success: true,
            data: users,
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error fetching internal chat conversations:", e)
        return NextResponse.json(
            { success: false, error: "Failed to fetch conversations" },
            { status: 500 }
        )
    }
}
