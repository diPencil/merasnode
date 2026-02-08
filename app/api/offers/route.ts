import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/offers
export async function GET() {
    try {
        const offers = await prisma.offer.findMany({
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({
            success: true,
            offers,
            count: offers.length,
        })
    } catch (error) {
        console.error("Error fetching offers:", error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch offers" },
            { status: 500 }
        )
    }
}

// POST /api/offers
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, description, content, validFrom, validTo, isActive } = body

        if (!title || !content || !validFrom || !validTo) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            )
        }

        const offer = await prisma.offer.create({
            data: {
                title,
                description: description || null,
                content,
                validFrom: new Date(validFrom),
                validTo: new Date(validTo),
                isActive: isActive !== undefined ? isActive : true,
            },
        })

        return NextResponse.json({
            success: true,
            offer,
        })
    } catch (error) {
        console.error("Error creating offer:", error)
        return NextResponse.json(
            { success: false, error: "Failed to create offer" },
            { status: 500 }
        )
    }
}
