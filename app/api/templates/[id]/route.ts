import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/logger"
import { requireDeleteAllowed, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

// PUT - Update Template
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        const body = await request.json()

        if (!body.name || !body.content) {
            return NextResponse.json(
                { success: false, error: "Name and content are required" },
                { status: 400 }
            )
        }

        const updateData: any = {
            name: body.name,
            content: body.content,
            category: body.category,
            language: body.language,
            status: body.status
        }
        if (body.whatsappAccountId !== undefined) updateData.whatsappAccountId = body.whatsappAccountId || null
        if (body.triggerKeywords !== undefined) updateData.triggerKeywords = body.triggerKeywords

        const template = await prisma.template.update({
            where: { id },
            data: updateData
        })

        await logActivity({
            action: "UPDATE",
            entityType: "Template",
            entityId: id,
            newValues: body,
            description: `Updated template: ${template.name}`
        })

        return NextResponse.json({ success: true, data: template })
    } catch (error) {
        console.error('Error updating template:', error)
        return NextResponse.json(
            { success: false, error: "Failed to update template" },
            { status: 500 }
        )
    }
}

// DELETE - Delete Template (ADMIN only; Supervisor blocked and audited)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        const template = await prisma.template.findUnique({ where: { id } })
        const prevState = template ? { name: template.name, category: template.category } : undefined
        const allowed = await requireDeleteAllowed(request, "Template", id, prevState)
        if (allowed instanceof NextResponse) return allowed
        const { scope } = allowed

        await prisma.template.delete({
            where: { id }
        })

        await logActivity({
            userId: scope.userId,
            action: "DELETE",
            entityType: "Template",
            entityId: id,
            oldValues: prevState,
            description: "Deleted template"
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        console.error('Error deleting template:', error)
        return NextResponse.json(
            { success: false, error: "Failed to delete template" },
            { status: 500 }
        )
    }
}
