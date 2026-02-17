import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, requireRoleWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

// GET /api/offer-categories — list categories with their branch IDs (for dropdowns and send filtering)
export async function GET(request: NextRequest) {
    try {
        await requireAuthWithScope(request)

        const categories = await prisma.offerCategory.findMany({
            orderBy: { name: "asc" },
            include: {
                branches: { select: { branchId: true }, orderBy: { branchId: "asc" } },
            },
        })

        const data = categories.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            branchIds: c.branches.map((b) => b.branchId),
            createdAt: c.createdAt,
        }))

        return NextResponse.json({ success: true, data })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error fetching offer categories:", e)
        return NextResponse.json(
            { success: false, error: "Failed to fetch offer categories" },
            { status: 500 }
        )
    }
}

// POST /api/offer-categories — create category (ADMIN only) and link branches
export async function POST(request: NextRequest) {
    try {
        await requireRoleWithScope(request, ["ADMIN"])

        const body = await request.json()
        const { name, description, branchIds } = body as {
            name?: string
            description?: string
            branchIds?: string[]
        }

        if (!name || typeof name !== "string" || !name.trim()) {
            return NextResponse.json(
                { success: false, error: "Category name is required" },
                { status: 400 }
            )
        }

        const ids = Array.isArray(branchIds) ? branchIds.filter((id: unknown) => typeof id === "string" && id.trim()) : []

        const category = await prisma.offerCategory.create({
            data: {
                name: name.trim(),
                description: typeof description === "string" ? description.trim() || null : null,
                branches: {
                    create: ids.map((branchId: string) => ({ branchId })),
                },
            },
            include: {
                branches: { select: { branchId: true } },
            },
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
        console.error("Error creating offer category:", e)
        return NextResponse.json(
            { success: false, error: "Failed to create offer category" },
            { status: 500 }
        )
    }
}
