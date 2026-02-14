import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireDeleteAllowed, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

// GET /api/offers/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const offer = await prisma.offer.findUnique({
            where: { id },
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
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const id = params.id;

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json(
                { success: false, error: "Invalid JSON body" },
                { status: 400 }
            );
        }

        const { title, description, content, imageUrl, validFrom, validTo, isActive } = body;

        // Ensure mandatory fields are present if needed, or allow partial updates
        if (!title || !content || !validFrom || !validTo) {
            // Basic validation for required fields on update if full update is expected
            // Alternatively, we can make update partial. For now, let's assume update form sends all fields.
        }

        const safeImageUrl =
            imageUrl !== undefined
                ? typeof imageUrl === "string" && imageUrl.startsWith("data:")
                    ? null
                    : imageUrl || null
                : undefined;

        const offer = await prisma.offer.update({
            where: { id },
            data: {
                title,
                description: description || null,
                content,
                imageUrl: safeImageUrl,
                validFrom: new Date(validFrom),
                validTo: new Date(validTo),
                isActive: isActive ?? true, // Default to true if undefined, but form should send it
            },
        });

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

// DELETE /api/offers/[id] (ADMIN only; Supervisor blocked and audited)
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const id = params.id;
        const offer = await prisma.offer.findUnique({ where: { id } })
        const prevState = offer ? { title: offer.title, status: offer.isActive } : undefined
        const allowed = await requireDeleteAllowed(request, "Offer", id, prevState)
        if (allowed instanceof NextResponse) return allowed

        await prisma.offer.delete({
            where: { id },
        })

        return NextResponse.json({
            success: true,
            message: "Offer deleted successfully",
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return unauthorizedResponse()
            if (error.message === "Forbidden") return forbiddenResponse()
        }
        console.error("Error deleting offer:", error)
        return NextResponse.json(
            { success: false, error: "Failed to delete offer" },
            { status: 500 }
        )
    }
}
