import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/invoices
export async function GET() {
    try {
        const invoices = await prisma.invoice.findMany({
            orderBy: { createdAt: "desc" },
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
            invoices,
            count: invoices.length,
        })
    } catch (error) {
        console.error("Error fetching invoices:", error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch invoices" },
            { status: 500 }
        )
    }
}

// POST /api/invoices
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { contactId, amount, currency, dueDate, notes, description } = body

        if (!contactId || !amount || !dueDate) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            )
        }

        // Generate invoice number
        const count = await prisma.invoice.count()
        const invoiceNumber = `INV-${String(count + 1).padStart(6, "0")}`

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                contactId,
                amount: parseFloat(amount),
                currency: currency || "SAR",
                dueDate: new Date(dueDate),
                notes: notes || null,
                items: [{
                    description: description || "Invoice Payment",
                    amount: parseFloat(amount)
                }],
                status: "PENDING",
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
        console.error("Error creating invoice:", error)
        return NextResponse.json(
            { success: false, error: "Failed to create invoice" },
            { status: 500 }
        )
    }
}
