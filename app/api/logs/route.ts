import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  requireAuthWithScope,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/api-auth"

// GET - Fetch activity logs (scoped by role: Admin all, Supervisor team, Agent own)
export async function GET(request: NextRequest) {
  try {
    const scope = await requireAuthWithScope(request)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500)
    const action = searchParams.get("action")
    const entityType = searchParams.get("entityType")

    const where: Record<string, unknown> = {}

    if (scope.role === "AGENT") {
      where.userId = scope.userId
    } else if (scope.role === "SUPERVISOR" && scope.branchIds.length > 0) {
      where.user = {
        branches: {
          some: { id: { in: scope.branchIds } },
        },
      }
    }
    if (action && action !== "all") where.action = action
    if (entityType && entityType !== "all") where.entityType = entityType

    const logs = await prisma.log.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({
      success: true,
      data: logs,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse()
      if (error.message === "Forbidden") return forbiddenResponse()
    }
    console.error("Error fetching logs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs" },
      { status: 500 }
    )
  }
}
