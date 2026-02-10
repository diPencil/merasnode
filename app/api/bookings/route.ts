import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
    requireAuthWithScope,
    unauthorizedResponse,
    forbiddenResponse,
} from "@/lib/api-auth"

function getBookingsWhere(scope: { role: string; userId: string; branchIds: string[] }) {
    if (scope.role === "ADMIN") return {}
    if (scope.role === "AGENT") {
        return { agentId: scope.userId }
    }
    if (scope.role === "SUPERVISOR" && scope.branchIds.length > 0) {
        return { contact: { branchId: { in: scope.branchIds } } }
    }
    if (scope.role === "SUPERVISOR") {
        return { id: "impossible" }
    }
    return {}
}

// GET - List bookings (role-scoped: Agent = own only, Supervisor = branch only, Admin = all)
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)

        const where = getBookingsWhere(scope)
        if (Object.keys(where).length === 1 && (where as any).id === "impossible") {
            return NextResponse.json({ success: true, data: [] })
        }

        const bookings = await prisma.booking.findMany({
            where,
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
            orderBy: { date: "desc" },
        })

        return NextResponse.json({
            success: true,
            data: bookings,
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        console.error("Error fetching bookings:", error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch bookings" },
            { status: 500 }
        )
    }
}

// POST - Create booking (Agent can only set self as agentId)
export async function POST(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const body = await request.json()
        let { contactId, agentId, branch, date, notes } = body

        if (scope.role === "AGENT") {
            agentId = scope.userId
        }
        if (scope.role === "SUPERVISOR" && agentId) {
            const agent = await prisma.user.findFirst({
                where: { id: agentId, branches: { some: { id: { in: scope.branchIds } } } },
            })
            if (!agent) {
                return forbiddenResponse("You can only assign agents from your branches")
            }
        }

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        })

        if (!contact) {
            return NextResponse.json(
                { success: false, error: "Contact not found" },
                { status: 404 }
            )
        }

        const bookingCount = await prisma.booking.count()
        const bookingNumber = `BK-${String(bookingCount + 1).padStart(3, "0")}`

        const booking = await prisma.booking.create({
            data: {
                bookingNumber,
                contactId,
                agentId: agentId || null,
                branch: branch || null,
                date: new Date(date),
                notes: notes || null,
                status: "CONFIRMED",
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

        return NextResponse.json(
            {
                success: true,
                data: booking,
            },
            { status: 201 }
        )
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        console.error("Error creating booking:", error)
        return NextResponse.json(
            { success: false, error: "Failed to create booking" },
            { status: 500 }
        )
    }
}
