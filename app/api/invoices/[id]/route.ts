import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/invoices/[id]
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: params.id },
            include: {
                contact: true,
            },
        })

        if (!invoice) {
            return NextResponse.json(
                { success: false, error: "Invoice not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            invoice,
        })
    } catch (error) {
        console.error("Error fetching invoice:", error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch invoice" },
            { status: 500 }
        )
    }
}

// PUT /api/invoices/[id]
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()
        const { amount, status, dueDate, paidAt, notes } = body

        const invoice = await prisma.invoice.update({
            where: { id: params.id },
            data: {
                amount: amount ? parseFloat(amount) : undefined,
                status,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                paidAt: paidAt ? new Date(paidAt) : undefined,
                notes: notes || null,
            },
            include: {
                contact: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
            },
        })

        return NextResponse.json({
            success: true,
            invoice,
        })
    } catch (error) {
        console.error("Error updating invoice:", error)
        return NextResponse.json(
            { success: false, error: "Failed to update invoice" },
            { status: 500 }
        )
    }
}

// DELETE /api/invoices/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.invoice.delete({
            where: { id: params.id },
        })

        return NextResponse.json({
            success: true,
            message: "Invoice deleted successfully",
        })
    } catch (error) {
        console.error("Error deleting invoice:", error)
        return NextResponse.json(
            { success: false, error: "Failed to delete invoice" },
            { status: 500 }
        )
    }
}
