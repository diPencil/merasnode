import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

/** GET - List agents for dropdowns. Scoped by role: ADMIN = all; SUPERVISOR = agents in same branches; AGENT = only self. */
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const role = scope.role as string

        if (role === "ADMIN") {
            const agents = await prisma.user.findMany({
                where: {
                    role: { in: ["AGENT", "ADMIN", "SUPERVISOR"] },
                    isActive: true
                },
                select: { id: true, name: true, role: true }
            })
            return NextResponse.json({ success: true, data: agents })
        }

        if (role === "AGENT") {
            const me = await prisma.user.findUnique({
                where: { id: scope.userId },
                select: { id: true, name: true, role: true }
            })
            return NextResponse.json({ success: true, data: me ? [me] : [] })
        }

        if (role === "SUPERVISOR") {
            const branchIds = scope.branchIds?.length ? scope.branchIds : []
            if (branchIds.length === 0) {
                return NextResponse.json({ success: true, data: [] })
            }
            const agents = await prisma.user.findMany({
                where: {
                    role: { in: ["AGENT", "ADMIN", "SUPERVISOR"] },
                    isActive: true,
                    branches: { some: { id: { in: branchIds } } }
                },
                select: { id: true, name: true, role: true }
            })
            return NextResponse.json({ success: true, data: agents })
        }

        return NextResponse.json({ success: true, data: [] })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        return NextResponse.json(
            { success: false, error: "Failed to fetch agents" },
            { status: 500 }
        )
    }
}
