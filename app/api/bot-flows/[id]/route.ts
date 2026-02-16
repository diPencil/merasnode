import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
    requireAuthWithScope,
    requireDeleteAllowed,
    unauthorizedResponse,
    forbiddenResponse,
} from "@/lib/api-auth"
import { hasPermission } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"

// PATCH - تحديث Bot Flow معين (center-scoped: non-Admin only flows in their branches)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const scope = await requireAuthWithScope(request)
        if (!hasPermission(scope.role as UserRole, "edit_bot_flow")) {
            return forbiddenResponse("You do not have permission to edit bot flows")
        }
        const { id } = await params
        const body = await request.json()

        const existing = await prisma.botFlow.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ success: false, error: "Bot flow not found" }, { status: 404 })
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
            where: { id },
            data: updateData
        })

        return NextResponse.json({
            success: true,
            data: botFlow
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        console.error('Error updating bot flow:', error)
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Bot flow not found"
                },
                { status: 404 }
            )
        }
        return NextResponse.json(
            {
                success: false,
                error: "Failed to update bot flow"
            },
            { status: 500 }
        )
    }
}

// DELETE - حذف Bot Flow (Admin only; Supervisor blocked and audited)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const flow = await prisma.botFlow.findUnique({ where: { id } })
        const prevState = flow ? { name: flow.name, trigger: flow.trigger } : undefined
        const allowed = await requireDeleteAllowed(request, "BotFlow", id, prevState)
        if (allowed instanceof NextResponse) return allowed
        if (!hasPermission((allowed as { scope: { role: string } }).scope.role as UserRole, "delete_bot_flow")) {
            return forbiddenResponse("You do not have permission to delete bot flows")
        }

        await prisma.botFlow.delete({
            where: { id }
        })

        return NextResponse.json({
            success: true,
            message: "Bot flow deleted successfully"
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        console.error('Error deleting bot flow:', error)
        if (error instanceof Error && error.message.includes('Record to delete not found')) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Bot flow not found"
                },
                { status: 404 }
            )
        }
        return NextResponse.json(
            {
                success: false,
                error: "Failed to delete bot flow"
            },
            { status: 500 }
        )
    }
}