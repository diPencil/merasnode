import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
    getUserWithScope,
    unauthorizedResponse,
    forbiddenResponse,
} from "@/lib/api-auth"

/**
 * GET - List agents for dropdowns (e.g. Book Appointment).
 * Role-scoped:
 * - ADMIN: all agents
 * - SUPERVISOR: only agents assigned to the same branch(es)
 * - AGENT: only the current user (can't assign to others)
 */
export async function GET(request: NextRequest) {
    try {
        const scope = await getUserWithScope(request)
        if (!scope) return unauthorizedResponse()

        if (scope.role === "AGENT") {
            const self = await prisma.user.findUnique({
                where: { id: scope.userId, isActive: true },
                select: { id: true, name: true, role: true },
            })
            return NextResponse.json({
                success: true,
                data: self ? [self] : [],
            })
        }

        if (scope.role === "SUPERVISOR" && scope.branchIds.length === 0) {
            return NextResponse.json({ success: true, data: [] })
        }

        const where: any = {
            role: { in: ["AGENT", "ADMIN", "SUPERVISOR"] },
            isActive: true,
        }
        if (scope.role === "SUPERVISOR") {
            where.branches = { some: { id: { in: scope.branchIds } } }
        }

        const agents = await prisma.user.findMany({
            where,
            select: { id: true, name: true, role: true },
        })

        return NextResponse.json({ success: true, data: agents })
    } catch (error) {
        console.error("Error fetching agents:", error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch agents" },
            { status: 500 }
        )
    }
}
