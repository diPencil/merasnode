import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// PUT - تحديث حجز
export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const body = await request.json()
        const { id } = params

        const existingBooking = await prisma.booking.findUnique({
            where: { id }
        })

        if (!existingBooking) {
            return NextResponse.json(
                { success: false, error: "Booking not found" },
                { status: 404 }
            )
        }

        const booking = await prisma.booking.update({
            where: { id },
            data: {
                agentId: body.agentId || null,
                branch: body.branch || null,
                date: body.date ? new Date(body.date) : undefined,
                notes: body.notes || null,
                status: body.status || undefined
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true
                    }
                },
                agent: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        return NextResponse.json({
            success: true,
            data: booking
        })
    } catch (error) {
        console.error('Error updating booking:', error)
        return NextResponse.json(
            { success: false, error: "Failed to update booking" },
            { status: 500 }
        )
    }
}

// PATCH - تحديث حجز (alias for PUT)
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    return PUT(request, props)
}

// DELETE - حذف حجز
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const { id } = params

        const existingBooking = await prisma.booking.findUnique({
            where: { id }
        })

        if (!existingBooking) {
            return NextResponse.json(
                { success: false, error: "Booking not found" },
                { status: 404 }
            )
        }

        await prisma.booking.delete({
            where: { id }
        })

        return NextResponse.json({
            success: true,
            message: "Booking deleted successfully"
        })
    } catch (error) {
        console.error('Error deleting booking:', error)
        return NextResponse.json(
            { success: false, error: "Failed to delete booking" },
            { status: 500 }
        )
    }
}
