import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
    requireAuthWithScope,
    unauthorizedResponse,
    forbiddenResponse,
} from "@/lib/api-auth"

// GET - List bookings. Scoped: ADMIN = all; SUPERVISOR = branch names in scope; AGENT = assigned to self only.
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const role = scope.role as string

        let where: Record<string, unknown> = {}

        if (role === "AGENT") {
            where.agentId = scope.userId
        } else if (role === "SUPERVISOR" && scope.branchIds?.length) {
            const branches = await prisma.branch.findMany({
                where: { id: { in: scope.branchIds } },
                select: { name: true }
            })
            const branchNames = branches.map((b) => b.name)
            if (branchNames.length > 0) {
                where.branch = { in: branchNames }
            }
        }

        const bookings = await prisma.booking.findMany({
            where,
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
            },
            orderBy: { date: "desc" }
        })

        return NextResponse.json({ success: true, data: bookings })
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

// POST - Create booking. Enforce: AGENT = only self; SUPERVISOR = agent in own branches; ADMIN = any.
export async function POST(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const body = await request.json()
        let { contactId, agentId, branch, date, notes } = body

        const contact = await prisma.contact.findUnique({
            where: { id: contactId }
        })
        if (!contact) {
            return NextResponse.json(
                { success: false, error: "Contact not found" },
                { status: 404 }
            )
        }

        const role = scope.role as string
        if (role === "AGENT") {
            agentId = scope.userId
        } else if (role === "SUPERVISOR" && agentId) {
            const agentUser = await prisma.user.findUnique({
                where: { id: agentId },
                select: { branches: { select: { id: true } } }
            })
            const agentBranchIds = (agentUser?.branches ?? []).map((b) => b.id)
            const allowed = scope.branchIds?.some((id) => agentBranchIds.includes(id))
            if (!allowed) {
                return NextResponse.json(
                    { success: false, error: "You can only assign agents from your branches" },
                    { status: 403 }
                )
            }
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
                status: "CONFIRMED"
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
        }, { status: 201 })
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
