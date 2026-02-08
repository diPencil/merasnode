import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// PATCH - تحديث Bot Flow معين
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params
        const body = await request.json()

        const updateData: any = {}
        if (body.isActive !== undefined) updateData.isActive = body.isActive
        if (body.name) updateData.name = body.name
        if (body.description !== undefined) updateData.description = body.description
        if (body.trigger) updateData.trigger = body.trigger
        if (body.steps) updateData.steps = body.steps

        const botFlow = await prisma.botFlow.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json({
            success: true,
            data: botFlow
        })
    } catch (error) {
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

// DELETE - حذف Bot Flow
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params

        await prisma.botFlow.delete({
            where: { id }
        })

        return NextResponse.json({
            success: true,
            message: "Bot flow deleted successfully"
        })
    } catch (error) {
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