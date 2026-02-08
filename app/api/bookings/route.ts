import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET - جلب جميع الحجوزات
export async function GET(request: NextRequest) {
    try {
        const bookings = await prisma.booking.findMany({
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
            orderBy: {
                date: 'desc'
            }
        })

        return NextResponse.json({
            success: true,
            data: bookings
        })
    } catch (error) {
        console.error('Error fetching bookings:', error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch bookings" },
            { status: 500 }
        )
    }
}

// POST - إنشاء حجز جديد
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { contactId, agentId, branch, date, notes } = body

        // التحقق من وجود جهة الاتصال
        const contact = await prisma.contact.findUnique({
            where: { id: contactId }
        })

        if (!contact) {
            return NextResponse.json(
                { success: false, error: "Contact not found" },
                { status: 404 }
            )
        }

        // توليد رقم الحجز
        const bookingCount = await prisma.booking.count()
        const bookingNumber = `BK-${String(bookingCount + 1).padStart(3, '0')}`

        // إنشاء الحجز
        const booking = await prisma.booking.create({
            data: {
                bookingNumber,
                contactId,
                agentId: agentId || null,
                branch: branch || null,
                date: new Date(date),
                notes: notes || null,
                status: 'CONFIRMED'
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
        console.error('Error creating booking:', error)
        return NextResponse.json(
            { success: false, error: "Failed to create booking" },
            { status: 500 }
        )
    }
}
