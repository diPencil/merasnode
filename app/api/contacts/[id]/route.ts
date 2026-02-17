import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/logger"
import { requireAuthWithScope, requireDeleteAllowed, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

// GET - Fetch single contact (scoped: non-Admin only within their branches)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        const { id } = await params
        const contact = await prisma.contact.findUnique({
            where: { id },
            include: {
                conversations: {
                    orderBy: { lastMessageAt: 'desc' },
                    take: 10
                }
            }
        })

        if (!contact) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Contact not found"
                },
                { status: 404 }
            )
        }

        if (scope.role !== 'ADMIN') {
            const inScope = scope.branchIds?.length && contact.branchId && scope.branchIds.includes(contact.branchId)
            if (!inScope) {
                return forbiddenResponse("You do not have access to this contact")
            }
        }

        return NextResponse.json({
            success: true,
            data: contact
        })
    } catch (error) {
        console.error('Error fetching contact:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch contact"
            },
            { status: 500 }
        )
    }
}

// PUT - Update contact (Admin only)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        if (scope.role !== "ADMIN") {
            return forbiddenResponse("Only Admin can edit or block contacts")
        }
        const { id } = await params
        const body = await request.json()

        // Get old values before update
        const oldContact = await prisma.contact.findUnique({
            where: { id }
        })

        const contact = await prisma.contact.update({
            where: { id },
            data: {
                name: body.name,
                phone: body.phone,
                email: body.email || null,
                tags: body.tags && body.tags.length > 0 ? body.tags : null,
                notes: body.notes || null,
                followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
                branchId: body.branchId || null
            }
        })

        // Log activity
        await logActivity({
            userId: scope.userId,
            action: "UPDATE",
            entityType: "Contact",
            entityId: contact.id,
            oldValues: {
                name: oldContact?.name,
                phone: oldContact?.phone,
                email: oldContact?.email
            },
            newValues: {
                name: contact.name,
                phone: contact.phone,
                email: contact.email
            },
            description: `Updated contact: ${contact.name}`
        })

        return NextResponse.json({
            success: true,
            data: contact
        })
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        console.error("Error updating contact:", error)

        if (error.code === 'P2025') {
            return NextResponse.json(
                {
                    success: false,
                    error: "Contact not found"
                },
                { status: 404 }
            )
        }

        if (error.code === 'P2002') {
            return NextResponse.json(
                {
                    success: false,
                    error: "Phone number already exists"
                },
                { status: 409 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                error: "Failed to update contact"
            },
            { status: 500 }
        )
    }
}

// DELETE - Delete contact (Admin only; Supervisor blocked and audited)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const contact = await prisma.contact.findUnique({ where: { id } })
        const prevState = contact ? { name: contact.name, phone: contact.phone, email: contact.email } : undefined
        const allowed = await requireDeleteAllowed(request, "Contact", id, prevState)
        if (allowed instanceof NextResponse) return allowed
        const { scope } = allowed

        await prisma.contact.delete({
            where: { id }
        })

        await logActivity({
            userId: scope.userId,
            action: "DELETE",
            entityType: "Contact",
            entityId: id,
            oldValues: prevState,
            description: `Deleted contact: ${contact?.name}`
        })

        return NextResponse.json({
            success: true,
            message: "Contact deleted successfully"
        })
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        console.error("Error deleting contact:", error)

        if (error.code === 'P2025') {
            return NextResponse.json(
                {
                    success: false,
                    error: "Contact not found"
                },
                { status: 404 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                error: "Failed to delete contact"
            },
            { status: 500 }
        )
    }
}
