import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, requireDeleteAllowed, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

async function canAccessBooking(scope: { role: string; userId: string; branchIds: string[] }, booking: { agentId: string | null; branch: string | null }) {
    if (scope.role === "ADMIN") return true
    if (scope.role === "AGENT") return booking.agentId === scope.userId
    if (scope.role === "SUPERVISOR" && scope.branchIds?.length && booking.branch) {
        const branches = await prisma.branch.findMany({
            where: { id: { in: scope.branchIds } },
            select: { name: true }
        })
        return branches.some((b) => b.name === booking.branch)
    }
    return false
}

// PUT - Update booking (scoped by role)
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
            where: { id }
        })
        if (!existingBooking) {
            return NextResponse.json(
                { success: false, error: "Booking not found" },
                { status: 404 }
            )
        }
        const allowed = await canAccessBooking(scope, existingBooking)
        if (!allowed) {
            return NextResponse.json(
                { success: false, error: "You do not have permission to update this booking" },
                { status: 403 }
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

// PATCH - Update booking (alias for PUT)
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    return PUT(request, props)
}

// DELETE - Delete booking (scoped by role)
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
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
        const prevState = { bookingNumber: existingBooking.bookingNumber, status: existingBooking.status, agentId: existingBooking.agentId }
        const deleteAllowed = await requireDeleteAllowed(request, "Booking", id, prevState)
        if (deleteAllowed instanceof NextResponse) return deleteAllowed
        const { scope } = deleteAllowed
        const allowed = await canAccessBooking(scope, existingBooking)
        if (!allowed) {
            return NextResponse.json(
                { success: false, error: "You do not have permission to delete this booking" },
                { status: 403 }
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
