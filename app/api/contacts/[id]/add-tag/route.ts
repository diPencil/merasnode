import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

/**
 * POST /api/contacts/[id]/add-tag
 * Append a tag to a contact's tags array. Allowed for any authenticated user who can see this contact (scope).
 * Used e.g. when sending an offer with tagToAssign — add that tag to recipients.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const scope = await requireAuthWithScope(request)
        const { id: contactId } = await params
        const body = await request.json()
        const tag = typeof body.tag === "string" ? body.tag.trim() : ""

        if (!tag) {
            return NextResponse.json(
                { success: false, error: "Tag is required" },
                { status: 400 }
            )
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

        if (scope.role !== "ADMIN") {
            const inBranch = scope.branchIds?.length && contact.branchId && scope.branchIds.includes(contact.branchId)
            const hasConvFromWa = scope.whatsappAccountIds?.length
                ? await prisma.conversation.findFirst({
                    where: {
                        contactId,
                        messages: {
                            some: { whatsappAccountId: { in: scope.whatsappAccountIds } },
                        },
                    },
                })
                : null
            const assignedToMe = await prisma.conversation.findFirst({
                where: { contactId, assignedToId: scope.userId },
            })
            if (!inBranch && !hasConvFromWa && !assignedToMe) {
                return forbiddenResponse("You do not have access to this contact.")
            }
        }

        const currentTags = contact.tags
            ? Array.isArray(contact.tags)
                ? [...(contact.tags as string[])]
                : String(contact.tags)
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
            : []

        if (currentTags.includes(tag)) {
            return NextResponse.json({
                success: true,
                data: { ...contact, tags: currentTags },
            })
        }

        const newTags = [...currentTags, tag]
        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: { tags: newTags },
        })

        return NextResponse.json({
            success: true,
            data: updated,
        })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error adding tag to contact:", e)
        return NextResponse.json(
            { success: false, error: "Failed to add tag" },
            { status: 500 }
        )
    }
}
