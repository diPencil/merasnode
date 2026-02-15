import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, requireDeleteAllowed, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"
import { hasPermission } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"

// GET /api/offers/[id] — view_offer required
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        const role = scope.role as UserRole
        if (!hasPermission(role, "view_offers")) {
            return forbiddenResponse("You do not have permission to view this offer.")
        }
        const { id } = await params
        const offer = await prisma.offer.findUnique({
            where: { id },
        })

        if (!offer) {
            return NextResponse.json(
                { success: false, error: "Offer not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            offer,
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error fetching offer:", e)
        return NextResponse.json(
            { success: false, error: "Failed to fetch offer" },
            { status: 500 }
        )
    }
}

// PUT /api/offers/[id] — edit_offer required (Admin, Supervisor only)
export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        const role = scope.role as UserRole
        if (!hasPermission(role, "edit_offer")) {
            return forbiddenResponse("You do not have permission to edit offers.")
        }

        const { id } = await props.params

        let body: Record<string, unknown>
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                { success: false, error: "Invalid JSON body" },
                { status: 400 }
            )
        }

        const { title, description, content, imageUrl, validFrom, validTo, isActive } = body as {
            title?: string; description?: string; content?: string; imageUrl?: string;
            validFrom?: string; validTo?: string; isActive?: boolean;
        }

        if (!title || !content || !validFrom || !validTo) {
            return NextResponse.json(
                { success: false, error: "Missing required fields: title, content, validFrom, validTo" },
                { status: 400 }
            )
        }

        const safeImageUrl =
            imageUrl !== undefined
                ? typeof imageUrl === "string" && imageUrl.startsWith("data:")
                    ? null
                    : imageUrl || null
                : undefined

        const offer = await prisma.offer.update({
            where: { id },
            data: {
                title,
                description: description ?? null,
                content,
                ...(safeImageUrl !== undefined && { imageUrl: safeImageUrl }),
                validFrom: new Date(validFrom),
                validTo: new Date(validTo),
                isActive: isActive ?? true,
            },
        })

        return NextResponse.json({
            success: true,
            offer,
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error updating offer:", e)
        return NextResponse.json(
            { success: false, error: "Failed to update offer" },
            { status: 500 }
        )
    }
}

// DELETE /api/offers/[id] (ADMIN only; Supervisor blocked and audited)
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const id = params.id;
        const offer = await prisma.offer.findUnique({ where: { id } })
        const prevState = offer ? { title: offer.title, status: offer.isActive } : undefined
        const allowed = await requireDeleteAllowed(request, "Offer", id, prevState)
        if (allowed instanceof NextResponse) return allowed

        await prisma.offer.delete({
            where: { id },
        })

        return NextResponse.json({
            success: true,
            message: "Offer deleted successfully",
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        console.error("Error deleting offer:", error)
        return NextResponse.json(
            { success: false, error: "Failed to delete offer" },
            { status: 500 }
        )
    }
}
