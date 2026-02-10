import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

/**
 * POST /api/contacts/backfill-branches
 *
 * Admin-only endpoint that back-fills `contact.branchId` for every contact
 * that currently has no branch assigned.  The branch is derived from the
 * WhatsApp account that sent/received the most-recent message in the
 * contact's conversation(s).
 *
 * This is a one-time migration helper, safe to call multiple times.
 */
export async function POST(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        if (scope.role !== 'ADMIN') {
            return forbiddenResponse('Only admins can run backfill')
        }

        // Find contacts with no branch assigned
        const contactsWithoutBranch = await prisma.contact.findMany({
            where: { branchId: null },
            select: { id: true, phone: true },
        })

        let updated = 0
        let skipped = 0

        for (const contact of contactsWithoutBranch) {
            // Find the most-recent message linked to a WA account that has a branch
            const recentMessage = await prisma.message.findFirst({
                where: {
                    conversation: { contactId: contact.id },
                    whatsappAccountId: { not: null },
                    whatsappAccount: { branchId: { not: null } },
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    whatsappAccount: { select: { branchId: true } },
                },
            })

            if (recentMessage?.whatsappAccount?.branchId) {
                await prisma.contact.update({
                    where: { id: contact.id },
                    data: { branchId: recentMessage.whatsappAccount.branchId },
                })
                updated++
            } else {
                skipped++
            }
        }

        return NextResponse.json({
            success: true,
            message: `Backfill complete. ${updated} contacts updated, ${skipped} contacts skipped (no WA account with branch found).`,
            updated,
            skipped,
            total: contactsWithoutBranch.length,
        })
    } catch (error: any) {
        if (error?.message === 'Unauthorized') return unauthorizedResponse()
        console.error('Backfill error:', error)
        return NextResponse.json(
            { success: false, error: 'Backfill failed' },
            { status: 500 }
        )
    }
}
