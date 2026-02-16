import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

// GET - جلب Bot Flows (center-scoped: non-Admin only see flows for their branches)
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const { searchParams } = new URL(request.url)
        const isActive = searchParams.get('active')

        const where: any = {}
        if (isActive !== null && isActive !== undefined) where.isActive = isActive === 'true'

        if (scope.role !== 'ADMIN') {
            if (!scope.branchIds?.length) {
                return NextResponse.json({ success: true, data: [], count: 0 })
            }
            where.branchId = { in: scope.branchIds }
        }

        const botFlows = await prisma.botFlow.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            success: true,
            data: botFlows,
            count: botFlows.length
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error('Error fetching bot flows:', e)
        return NextResponse.json(
            { success: false, error: "Failed to fetch bot flows" },
            { status: 500 }
        )
    }
}

// POST - إنشاء Bot Flow جديد (center-scoped: non-Admin must set branchId from their scope)
export async function POST(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const body = await request.json()

        if (!body.name || !body.trigger || !body.steps) {
            return NextResponse.json(
                { success: false, error: "Name, trigger, and steps are required" },
                { status: 400 }
            )
        }

        let branchId: string | null = body.branchId || null
        if (scope.role !== 'ADMIN') {
            if (!scope.branchIds?.length) {
                return forbiddenResponse("You do not have any assigned branches for bot flows.")
            }
            if (branchId && !scope.branchIds.includes(branchId)) {
                return forbiddenResponse("You cannot create bot flows for this branch.")
            }
            if (!branchId && scope.branchIds.length === 1) {
                branchId = scope.branchIds[0]
            }
        }

        const botFlow = await prisma.botFlow.create({
            data: {
                name: body.name,
                description: body.description || null,
                trigger: body.trigger,
                steps: body.steps,
                isActive: body.isActive !== undefined ? body.isActive : true,
                branchId,
            }
        })

        return NextResponse.json({
            success: true,
            data: botFlow
        }, { status: 201 })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error('Error creating bot flow:', e)
        return NextResponse.json(
            { success: false, error: "Failed to create bot flow" },
            { status: 500 }
        )
    }
}

// PATCH - تحديث Bot Flow (non-Admin can only update flows in their branches)
export async function PATCH(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const body = await request.json()

        if (!body.id) {
            return NextResponse.json(
                { success: false, error: "Bot Flow ID is required" },
                { status: 400 }
            )
        }

        const existing = await prisma.botFlow.findUnique({ where: { id: body.id } })
        if (!existing) {
            return NextResponse.json(
                { success: false, error: "Bot flow not found" },
                { status: 404 }
            )
        }
        if (scope.role !== 'ADMIN') {
            if (!existing.branchId || !scope.branchIds?.includes(existing.branchId)) {
                return forbiddenResponse("You cannot update this bot flow.")
            }
        }

        const updateData: any = {}
        if (body.isActive !== undefined) updateData.isActive = body.isActive
        if (body.name) updateData.name = body.name
        if (body.description !== undefined) updateData.description = body.description
        if (body.trigger) updateData.trigger = body.trigger
        if (body.steps) updateData.steps = body.steps
        if (body.branchId !== undefined) {
            if (scope.role !== 'ADMIN' && body.branchId && !scope.branchIds?.includes(body.branchId)) {
                return forbiddenResponse("You cannot assign this bot flow to that branch.")
            }
            updateData.branchId = body.branchId || null
        }

        const botFlow = await prisma.botFlow.update({
            where: { id: body.id },
            data: updateData
        })

        return NextResponse.json({
            success: true,
            data: botFlow
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error('Error updating bot flow:', e)
        return NextResponse.json(
            { success: false, error: "Failed to update bot flow" },
            { status: 500 }
        )
    }
}