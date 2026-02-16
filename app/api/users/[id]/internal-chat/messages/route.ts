import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

/**
 * GET /api/users/[id]/internal-chat/messages
 * List messages between current user and user [id]. Both participants can access.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        const { id: otherId } = await params
        const currentUserId = scope.userId
        if (otherId === currentUserId) {
            return NextResponse.json(
                { success: false, error: "Cannot chat with yourself." },
                { status: 400 }
            )
        }

        const other = await prisma.user.findUnique({
            where: { id: otherId },
            select: {
                id: true,
                name: true,
                status: true,
                role: true,
                lastLoginAt: true,
                lastLogoutAt: true,
                lastActivityAt: true,
                branches: { select: { id: true, name: true } },
            },
        })
        if (!other) {
            return NextResponse.json(
                { success: false, error: "User not found." },
                { status: 404 }
            )
        }

        const messages = await prisma.internalMessage.findMany({
            where: {
                OR: [
                    { senderId: currentUserId, receiverId: otherId },
                    { senderId: otherId, receiverId: currentUserId },
                ],
            },
            orderBy: { createdAt: "asc" },
            include: {
                sender: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json({
            success: true,
            data: { messages, other },
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error fetching internal chat messages:", e)
        return NextResponse.json(
            { success: false, error: "Failed to fetch messages" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/users/[id]/internal-chat/messages
 * Send a message from current user to user [id]. Both participants can send.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        const { id: otherId } = await params
        const currentUserId = scope.userId
        if (otherId === currentUserId) {
            return NextResponse.json(
                { success: false, error: "Cannot chat with yourself." },
                { status: 400 }
            )
        }

        const other = await prisma.user.findUnique({
            where: { id: otherId },
            select: { id: true, isActive: true },
        })
        if (!other || !other.isActive) {
            return NextResponse.json(
                { success: false, error: "User not found or inactive." },
                { status: 404 }
            )
        }

        const body = await request.json()
        const content = typeof body.content === "string" ? body.content.trim() : ""
        const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl.trim() || null : null
        if (!content && !mediaUrl) {
            return NextResponse.json(
                { success: false, error: "Message content or image is required." },
                { status: 400 }
            )
        }

        const message = await prisma.internalMessage.create({
            data: {
                senderId: currentUserId,
                receiverId: otherId,
                content: content || "",
                mediaUrl,
            },
            include: {
                sender: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json({
            success: true,
            data: message,
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error sending internal chat message:", e)
        return NextResponse.json(
            { success: false, error: "Failed to send message" },
            { status: 500 }
        )
    }
}
