import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRoleWithScope } from "@/lib/api-auth"

// GET - Fetch activity logs (ADMIN and SUPERVISOR only)
export async function GET(request: NextRequest) {
    try {
        const scope = await requireRoleWithScope(request, ['ADMIN', 'SUPERVISOR'])

        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action')
        const entityType = searchParams.get('entityType')
        const userId = searchParams.get('userId')
        const limit = parseInt(searchParams.get('limit') || '50')

        const where: any = {}
        if (action && action !== 'all') where.action = action
        if (entityType && entityType !== 'all') where.entityType = entityType
        if (userId) where.userId = userId

        // SUPERVISOR: only see logs from users in their branches
        if (scope.role === 'SUPERVISOR') {
            const branchUsers = await prisma.user.findMany({
                where: {
                    branches: {
                        some: { id: { in: scope.branchIds } }
                    }
                },
                select: { id: true }
            })
            const userIds = branchUsers.map(u => u.id)
            where.userId = { in: userIds }
        }

        const logs = await prisma.log.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        return NextResponse.json({
            success: true,
            data: logs,
            count: logs.length
        })
    } catch (error) {
        console.error('Error fetching logs:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch logs'
        const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
        return NextResponse.json(
            { success: false, error: message },
            { status }
        )
    }
}
