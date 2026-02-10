import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
    requireAuthWithScope,
    requireRoleWithScope,
    unauthorizedResponse,
    forbiddenResponse,
} from "@/lib/api-auth"

// GET /api/branches - List branches (scoped by role)
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)

        // Build where clause based on role
        const where: any = {}
        if (scope.role === 'AGENT' || scope.role === 'SUPERVISOR') {
            where.id = { in: scope.branchIds }
        }
        // ADMIN sees all branches

        const branches = await prisma.branch.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { whatsappAccounts: true },
                },
            },
        })

        return NextResponse.json({
            success: true,
            branches,
            count: branches.length,
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse()
        }
        console.error("Error fetching branches:", error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch branches" },
            { status: 500 }
        )
    }
}

// POST /api/branches - Create new branch (ADMIN only)
export async function POST(request: NextRequest) {
    try {
        const scope = await requireRoleWithScope(request, ['ADMIN'])

        const body = await request.json()
        const { name, address, phone, email, isActive } = body

        if (!name) {
            return NextResponse.json(
                { success: false, error: "Branch name is required" },
                { status: 400 }
            )
        }

        const branch = await prisma.branch.create({
            data: {
                name,
                address: address || null,
                phone: phone || null,
                email: email || null,
                isActive: isActive !== undefined ? isActive : true,
            },
        })

        return NextResponse.json({ success: true, branch })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse('Only admins can create branches')
        }
        console.error("Error creating branch:", error)
        return NextResponse.json(
            { success: false, error: "Failed to create branch" },
            { status: 500 }
        )
    }
}
