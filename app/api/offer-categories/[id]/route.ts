import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, requireRoleWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

// GET /api/offer-categories/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAuthWithScope(request)
        const { id } = await params

        const category = await prisma.offerCategory.findUnique({
            where: { id },
            include: { branches: { select: { branchId: true } } },
        })

        if (!category) {
            return NextResponse.json(
                { success: false, error: "Category not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                id: category.id,
                name: category.name,
                description: category.description,
                branchIds: category.branches.map((b) => b.branchId),
            },
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error fetching offer category:", e)
        return NextResponse.json(
            { success: false, error: "Failed to fetch offer category" },
            { status: 500 }
        )
    }
}

// PUT /api/offer-categories/[id] — ADMIN only
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireRoleWithScope(request, ["ADMIN"])
        const { id } = await params

        const body = await request.json().catch(() => ({}))
        const { name, description, branchIds } = body as {
            name?: string
            description?: string
            branchIds?: string[]
        }

        const existing = await prisma.offerCategory.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json(
                { success: false, error: "Category not found" },
                { status: 404 }
            )
        }

        const ids = Array.isArray(branchIds) ? branchIds.filter((b: unknown) => typeof b === "string" && b.trim()) : []

        await prisma.$transaction([
            prisma.categoryBranch.deleteMany({ where: { categoryId: id } }),
            ...(ids.length > 0
                ? [prisma.categoryBranch.createMany({ data: ids.map((branchId: string) => ({ categoryId: id, branchId })) })]
                : []),
        ])

        const category = await prisma.offerCategory.update({
            where: { id },
            data: {
                ...(typeof name === "string" && name.trim() && { name: name.trim() }),
                ...(description !== undefined && { description: typeof description === "string" ? description.trim() || null : null }),
            },
            include: { branches: { select: { branchId: true } } },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: category.id,
                name: category.name,
                description: category.description,
                branchIds: category.branches.map((b) => b.branchId),
            },
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error updating offer category:", e)
        return NextResponse.json(
            { success: false, error: "Failed to update offer category" },
            { status: 500 }
        )
    }
}

// DELETE /api/offer-categories/[id] — ADMIN only
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireRoleWithScope(request, ["ADMIN"])
        const { id } = await params

        const existing = await prisma.offerCategory.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json(
                { success: false, error: "Category not found" },
                { status: 404 }
            )
        }

        await prisma.offerCategory.delete({ where: { id } })

        return NextResponse.json({ success: true, message: "Category deleted" })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error deleting offer category:", e)
        return NextResponse.json(
            { success: false, error: "Failed to delete offer category" },
            { status: 500 }
        )
    }
}
