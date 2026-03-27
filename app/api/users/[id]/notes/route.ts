import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"
import { logActivity } from "@/lib/logger"
import { alsoNotifyAdmins } from "@/lib/notifications"

/**
 * GET /api/users/[id]/notes
 * List private internal notes for a user. Supervisor + Admin only.
 * Not visible to the target user or to customers.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        if (scope.role !== "ADMIN" && scope.role !== "SUPERVISOR") {
            return forbiddenResponse("Only Supervisor or Admin can view internal user notes.")
        }

        const { id: userId } = await params
        const notes = await prisma.userNote.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        })

        return NextResponse.json({
            success: true,
            data: notes,
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error fetching user notes:", e)
        return NextResponse.json(
            { success: false, error: "Failed to fetch notes" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/users/[id]/notes
 * Add a private internal note to a user. Supervisor + Admin only.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        if (scope.role !== "ADMIN" && scope.role !== "SUPERVISOR") {
            return forbiddenResponse("Only Supervisor or Admin can add internal user notes.")
        }

        const { id: userId } = await params
        const body = await request.json()
        const content = typeof body.content === "string" ? body.content.trim() : ""

        if (!content) {
            return NextResponse.json(
                { success: false, error: "Note content is required" },
                { status: 400 }
            )
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        })
        if (!targetUser) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            )
        }

        const note = await prisma.userNote.create({
            data: {
                userId,
                content,
                createdById: scope.userId,
            },
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        })

        await logActivity({
            userId: scope.userId,
            userName: note.createdBy.name,
            action: "CREATE",
            entityType: "UserNote",
            entityId: note.id,
            newValues: {
                targetUserId: userId,
                content: note.content,
            },
            description: `Added internal note to user ${userId}`,
        })

        try {
            const title = "Internal note"
            const message = `A note was added to your profile by ${note.createdBy.name}.`
            const link = `/internal-chat?with=${scope.userId}`
            await prisma.notification.create({
                data: { userId, title, message, type: "INFO", link },
            })
            await alsoNotifyAdmins({ title, message, type: "INFO", link }, [userId])
        } catch (_) {
            /* non-blocking */
        }

        return NextResponse.json({
            success: true,
            data: note,
        }, { status: 201 })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error creating user note:", e)
        return NextResponse.json(
            { success: false, error: "Failed to create note" },
            { status: 500 }
        )
    }
}
