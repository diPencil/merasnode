import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/logger"
import {
    requireAuthWithScope,
    unauthorizedResponse,
    forbiddenResponse,
} from "@/lib/api-auth"

// GET - جلب جهة اتصال واحدة (scoped: non-Admin only see if contact in their branches)
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

        if (scope.role !== 'ADMIN' && contact.branchId && !scope.branchIds.includes(contact.branchId)) {
            return forbiddenResponse('You do not have access to this contact')
        }

        return NextResponse.json({
            success: true,
            data: contact
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse()
        }
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

// PUT - تحديث جهة اتصال (Admin only; prevents Edit/Block for Agent and Supervisor)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        if (scope.role !== 'ADMIN') {
            return forbiddenResponse('Only admins can edit contacts')
        }
        const { id } = await params
        const body = await request.json()

        // Get old values before update
        const oldContact = await prisma.contact.findUnique({
            where: { id }
        })

        // Only update fields that are explicitly provided in the request body
        const updateData: Record<string, any> = {}
        if ('name' in body) updateData.name = body.name
        if ('phone' in body) updateData.phone = body.phone
        if ('email' in body) updateData.email = body.email || null
        if ('tags' in body) updateData.tags = body.tags && body.tags.length > 0 ? body.tags : null
        if ('notes' in body) updateData.notes = body.notes || null
        if ('followUpDate' in body) updateData.followUpDate = body.followUpDate ? new Date(body.followUpDate) : null
        if ('branchId' in body) updateData.branchId = body.branchId || null

        const contact = await prisma.contact.update({
            where: { id },
            data: updateData,
        })

        // Log activity
        await logActivity({
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
    } catch (error: any) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse()
        }
        console.error('Error updating contact:', error)

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

// DELETE - حذف جهة اتصال (Admin only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        if (scope.role !== 'ADMIN') {
            return forbiddenResponse('Only admins can delete contacts')
        }
        const { id } = await params
        // Get contact before delete
        const contact = await prisma.contact.findUnique({
            where: { id }
        })

        await prisma.contact.delete({
            where: { id }
        })

        // Log activity
        await logActivity({
            action: "DELETE",
            entityType: "Contact",
            entityId: id,
            oldValues: {
                name: contact?.name,
                phone: contact?.phone,
                email: contact?.email
            },
            description: `Deleted contact: ${contact?.name}`
        })

        return NextResponse.json({
            success: true,
            message: "Contact deleted successfully"
        })
    } catch (error: any) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse()
        }
        console.error('Error deleting contact:', error)

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
