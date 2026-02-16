import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

/**
 * GET /api/internal-chat/team-members
 * List users the current user can chat with (for the left column).
 * - ADMIN: all users except self
 * - SUPERVISOR: SUPERVISOR + AGENT (same scope as user list)
 * - AGENT: ADMIN + SUPERVISOR (to message management)
 */
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const myId = scope.userId
        const role = scope.role

        const where: any = {
            id: { not: myId },
            isActive: true,
        }

        if (role === "ADMIN") {
            // no extra filter
        } else if (role === "SUPERVISOR") {
            where.role = { in: ["SUPERVISOR", "AGENT"] }
        } else if (role === "AGENT") {
            where.role = { in: ["ADMIN", "SUPERVISOR"] }
        } else {
            return NextResponse.json({ success: true, data: [] })
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
                role: true,
            },
            orderBy: { name: "asc" },
        })

        return NextResponse.json({
            success: true,
            data: users,
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error fetching team members:", e)
        return NextResponse.json(
            { success: false, error: "Failed to fetch team members" },
            { status: 500 }
        )
    }
}
