import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
    requireAuthWithScope,
    requireRoleWithScope,
    requireDeleteAllowed,
    unauthorizedResponse,
    forbiddenResponse,
} from "@/lib/api-auth"

// GET /api/branches/[id] - Get single branch (auth + scope check)
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        const params = await context.params

        // Non-admin: verify branch is in their scope
        if (scope.role !== 'ADMIN' && !scope.branchIds.includes(params.id)) {
            return NextResponse.json(
                { success: false, error: "Branch not found" },
                { status: 404 }
            )
        }

        const branch = await prisma.branch.findUnique({
            where: { id: params.id },
            include: { whatsappAccounts: true },
        })

        if (!branch) {
            return NextResponse.json(
                { success: false, error: "Branch not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, branch })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse()
        }
        console.error("Error fetching branch:", error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch branch" },
            { status: 500 }
        )
    }
}

// PUT /api/branches/[id] - Update branch (ADMIN only)
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireRoleWithScope(request, ['ADMIN'])
        const params = await context.params
        const body = await request.json()
        const { name, address, phone, email, isActive } = body

        const branch = await prisma.branch.update({
            where: { id: params.id },
            data: {
                name,
                address: address || null,
                phone: phone || null,
                email: email || null,
                isActive,
            },
        })

        return NextResponse.json({ success: true, branch })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse('Only admins can update branches')
        }
        console.error("Error updating branch:", error)
        return NextResponse.json(
            { success: false, error: "Failed to update branch" },
            { status: 500 }
        )
    }
}

// DELETE /api/branches/[id] - Delete branch (ADMIN only; Supervisor blocked and audited)
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const branch = await prisma.branch.findUnique({
            where: { id: params.id },
            include: { _count: { select: { whatsappAccounts: true } } },
        })
        if (!branch) {
            return NextResponse.json(
                { success: false, error: "Branch not found" },
                { status: 404 }
            )
        }
        const prevState = { name: branch.name, address: branch.address, phone: branch.phone }
        const allowed = await requireDeleteAllowed(request, "Branch", params.id, prevState)
        if (allowed instanceof NextResponse) return allowed

        if (branch._count.whatsappAccounts > 0) {
            await prisma.whatsAppAccount.updateMany({
                where: { branchId: params.id },
                data: { branchId: null },
            })
        }

        await prisma.branch.delete({ where: { id: params.id } })

        return NextResponse.json({
            success: true,
            message: "Branch deleted successfully",
        })
    } catch (error: any) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse('Only admins can delete branches')
        }
        console.error("Error deleting branch:", error)
        return NextResponse.json(
            { success: false, error: error.message || "Failed to delete branch" },
            { status: 500 }
        )
    }
}
