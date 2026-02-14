import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth"

/**
 * POST /api/offers/[id]/record-send
 * تسجيل إرسال العرض (فردي أو جماعي) لتحديث الإحصائيات
 * Body: { mode: 'single' | 'bulk', recipientCount: number }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth(request)
    } catch {
        return unauthorizedResponse()
    }

    try {
        const body = await request.json()
        const { mode, recipientCount } = body as { mode?: string; recipientCount?: number }

        if (!mode || !["single", "bulk"].includes(mode)) {
            return NextResponse.json(
                { success: false, error: "mode must be 'single' or 'bulk'" },
                { status: 400 }
            )
        }

        const count = Math.max(0, Number(recipientCount) || (mode === "single" ? 1 : 0))

        const offer = await prisma.offer.findUnique({
            where: { id: params.id },
        })

        if (!offer) {
            return NextResponse.json(
                { success: false, error: "Offer not found" },
                { status: 404 }
            )
        }

        const updated = await prisma.offer.update({
            where: { id: params.id },
            data: {
                recipientsCount: { increment: count },
                ...(mode === "single"
                    ? { singleSendCount: { increment: 1 } }
                    : { bulkSendCount: { increment: 1 } }),
            },
        })

        return NextResponse.json({
            success: true,
            offer: updated,
        })
    } catch (error) {
        console.error("Error recording offer send:", error)
        return NextResponse.json(
            { success: false, error: "Failed to record send" },
            { status: 500 }
        )
    }
}
