import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"
import { hasPermission } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"

// GET /api/offers — view_offers required (Admin, Supervisor, Agent)
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const role = scope.role as UserRole
        if (!hasPermission(role, "view_offers")) {
            return forbiddenResponse("You do not have permission to view offers.")
        }
        const offers = await prisma.offer.findMany({
            orderBy: { createdAt: "desc" },
        })
        return NextResponse.json({
            success: true,
            offers,
            count: offers.length,
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error fetching offers:", e)
        return NextResponse.json(
            { success: false, error: "Failed to fetch offers" },
            { status: 500 }
        )
    }
}

// POST /api/offers — create_offer required (Admin, Supervisor only; Agent blocked)
export async function POST(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const role = scope.role as UserRole
        if (!hasPermission(role, "create_offer")) {
            return forbiddenResponse("You do not have permission to create offers.")
        }
        const body = await request.json()
        const { title, description, content, imageUrl, validFrom, validTo, isActive } = body

        if (!title || !content || !validFrom || !validTo) {
            return NextResponse.json(
                { success: false, error: "Missing required fields: title, content, validFrom, validTo" },
                { status: 400 }
            )
        }
        const safeImageUrl =
            typeof imageUrl === "string" && imageUrl.startsWith("data:") ? null : imageUrl || null

        const offer = await prisma.offer.create({
            data: {
                title,
                description: description || null,
                content,
                imageUrl: safeImageUrl,
                validFrom: new Date(validFrom),
                validTo: new Date(validTo),
                isActive: isActive !== undefined ? isActive : true,
            },
        })

        return NextResponse.json({
            success: true,
            offer,
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error creating offer:", e)
        return NextResponse.json(
            { success: false, error: "Failed to create offer" },
            { status: 500 }
        )
    }
}
