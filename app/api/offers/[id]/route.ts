import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/offers/[id]
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const offer = await prisma.offer.findUnique({
            where: { id: params.id },
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
    } catch (error) {
        console.error("Error fetching offer:", error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch offer" },
            { status: 500 }
        )
    }
}

// PUT /api/offers/[id]
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()
        const { title, description, content, validFrom, validTo, isActive } = body

        const offer = await prisma.offer.update({
            where: { id: params.id },
            data: {
                title,
                description: description || null,
                content,
                validFrom: new Date(validFrom),
                validTo: new Date(validTo),
                isActive,
            },
        })

        return NextResponse.json({
            success: true,
            offer,
        })
    } catch (error) {
        console.error("Error updating offer:", error)
        return NextResponse.json(
            { success: false, error: "Failed to update offer" },
            { status: 500 }
        )
    }
}

// DELETE /api/offers/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.offer.delete({
            where: { id: params.id },
        })

        return NextResponse.json({
            success: true,
            message: "Offer deleted successfully",
        })
    } catch (error) {
        console.error("Error deleting offer:", error)
        return NextResponse.json(
            { success: false, error: "Failed to delete offer" },
            { status: 500 }
        )
    }
}
