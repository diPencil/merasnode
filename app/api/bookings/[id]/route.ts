import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
    requireAuthWithScope,
    unauthorizedResponse,
    forbiddenResponse,
} from "@/lib/api-auth"

async function canManageBooking(
    scope: { role: string; userId: string; branchIds: string[] },
    booking: { agentId: string | null; contact: { branchId: string | null } }
) {
    if (scope.role === "ADMIN") return true
    if (scope.role === "AGENT") return false
    if (scope.role === "SUPERVISOR") {
        return (
            booking.contact.branchId != null &&
            scope.branchIds.includes(booking.contact.branchId)
        )
    }
    return false
}

// PUT - Update booking (Admin or Supervisor for their branches only; Agent cannot)
export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        const params = await props.params
        const body = await request.json()
        const { id } = params

        const existingBooking = await prisma.booking.findUnique({
            where: { id },
            include: { contact: { select: { branchId: true } } },
        })

        if (!existingBooking) {
            return NextResponse.json(
                { success: false, error: "Booking not found" },
                { status: 404 }
            )
        }

        const allowed = await canManageBooking(scope, existingBooking)
        if (!allowed) return forbiddenResponse("You cannot update this booking")

        const booking = await prisma.booking.update({
            where: { id },
            data: {
                agentId: body.agentId ?? existingBooking.agentId,
                branch: body.branch ?? existingBooking.branch,
                date: body.date ? new Date(body.date) : existingBooking.date,
                notes: body.notes !== undefined ? body.notes : existingBooking.notes,
                status: body.status ?? existingBooking.status,
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
                agent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        })

        return NextResponse.json({
            success: true,
            data: booking,
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        console.error("Error updating booking:", error)
        return NextResponse.json(
            { success: false, error: "Failed to update booking" },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    return PUT(request, props)
}

// DELETE - Cancel/delete booking (Admin or Supervisor for their branches only; Agent cannot)
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        const params = await props.params
        const { id } = params

        const existingBooking = await prisma.booking.findUnique({
            where: { id },
            include: { contact: { select: { branchId: true } } },
        })

        if (!existingBooking) {
            return NextResponse.json(
                { success: false, error: "Booking not found" },
                { status: 404 }
            )
        }

        const allowed = await canManageBooking(scope, existingBooking)
        if (!allowed) return forbiddenResponse("You cannot delete this booking")

        await prisma.booking.delete({
            where: { id },
        })

        return NextResponse.json({
            success: true,
            message: "Booking deleted successfully",
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        console.error("Error deleting booking:", error)
        return NextResponse.json(
            { success: false, error: "Failed to delete booking" },
            { status: 500 }
        )
    }
}
