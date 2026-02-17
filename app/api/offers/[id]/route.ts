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
            include: { category: { select: { id: true, name: true } } },
        })

        if (!offer) {
            return NextResponse.json(
                { success: false, error: "Offer not found" },
                { status: 404 }
            )
        }

        // Non-admins can only access offers that belong to their scoped WhatsApp accounts
        if (role !== "ADMIN") {
            if (!scope.whatsappAccountIds.includes(offer.whatsappAccountId || "")) {
                return forbiddenResponse("You do not have permission to view this offer.")
            }
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

        const { title, description, content, imageUrl, validFrom, validTo, isActive, whatsappAccountId, tagToAssign, categoryId } = body as {
            title?: string; description?: string; content?: string; imageUrl?: string;
            validFrom?: string; validTo?: string; isActive?: boolean; whatsappAccountId?: string; tagToAssign?: string; categoryId?: string;
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

        const existing = await prisma.offer.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json(
                { success: false, error: "Offer not found" },
                { status: 404 }
            )
        }

        // Non-admins can only edit offers for their own WhatsApp accounts
        let nextWhatsappAccountId: string | null | undefined = existing.whatsappAccountId
        if (role === "ADMIN") {
            // Admin can move offer between accounts or set to null
            if (whatsappAccountId !== undefined) {
                nextWhatsappAccountId = whatsappAccountId || null
            }
        } else {
            const allowedIds = scope.whatsappAccountIds || []
            if (allowedIds.length === 0) {
                return forbiddenResponse("You do not have any assigned WhatsApp accounts for offers.")
            }

            // Existing offer must already belong to scoped account
            if (!existing.whatsappAccountId || !allowedIds.includes(existing.whatsappAccountId)) {
                return forbiddenResponse("You cannot edit this offer.")
            }

            if (whatsappAccountId !== undefined) {
                if (!allowedIds.includes(whatsappAccountId)) {
                    return forbiddenResponse("You cannot move offer to this WhatsApp account.")
                }
                nextWhatsappAccountId = whatsappAccountId
            }
        }

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
                whatsappAccountId: nextWhatsappAccountId,
                tagToAssign: tagToAssign !== undefined ? (typeof tagToAssign === "string" ? tagToAssign.trim() || null : null) : undefined,
                categoryId: categoryId !== undefined ? (typeof categoryId === "string" && categoryId.trim() ? categoryId.trim() : null) : undefined,
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
        const scope = await requireAuthWithScope(request)
        const role = scope.role as UserRole

        const params = await props.params;
        const id = params.id;
        const offer = await prisma.offer.findUnique({ where: { id } })
        const prevState = offer ? { title: offer.title, status: offer.isActive } : undefined

        // Non-admins cannot delete offers (enforced by requireDeleteAllowed), but
        // we also double-check scope in case rules change in المستقبل.
        if (offer && role !== "ADMIN") {
            if (!scope.whatsappAccountIds.includes(offer.whatsappAccountId || "")) {
                return forbiddenResponse()
            }
        }
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
