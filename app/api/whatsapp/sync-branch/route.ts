import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  requireRoleWithScope,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/api-auth"

/**
 * POST /api/whatsapp/sync-branch
 * Ensure WhatsApp account is linked to a branch and propagate that branch
 * to related contacts (and conversations where branch is missing).
 *
 * Body: { accountId: string, branchId: string }
 *
 * Only ADMIN and SUPERVISOR can call this.
 */
export async function POST(request: NextRequest) {
  try {
    const scope = await requireRoleWithScope(request, ["ADMIN", "SUPERVISOR"])
    const body = await request.json()
    const { accountId, branchId } = body

    if (!accountId || !branchId) {
      return NextResponse.json(
        { success: false, error: "accountId and branchId are required" },
        { status: 400 }
      )
    }

    // Verify branch is within supervisor scope (admins can use any)
    if (scope.role === "SUPERVISOR" && !scope.branchIds.includes(branchId)) {
      return forbiddenResponse("You do not have access to this branch")
    }

    const account = await prisma.whatsAppAccount.findUnique({
      where: { id: accountId },
      select: { id: true, branchId: true, phone: true },
    })

    if (!account) {
      return NextResponse.json(
        { success: false, error: "WhatsApp account not found" },
        { status: 404 }
      )
    }

    // 1) Update WhatsApp account branch if needed
    if (account.branchId !== branchId) {
      await prisma.whatsAppAccount.update({
        where: { id: accountId },
        data: { branchId },
      })
    }

    // 2) Propagate branch to contacts that came from this phone and have no branch yet
    // We rely on contact.phone matching the bare phone number used for the account
    const plainPhone = account.phone.replace(/[^0-9]/g, "")

    const updatedContacts = await prisma.contact.updateMany({
      where: {
        branchId: null,
        OR: [
          { phone: plainPhone },
          { phone: account.phone },
        ],
      },
      data: { branchId },
    })

    return NextResponse.json({
      success: true,
      message: "Branch sync completed",
      data: {
        accountId,
        branchId,
        updatedContacts: updatedContacts.count,
      },
    })
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse()
      if (error.message === "Forbidden") return forbiddenResponse()
    }
    console.error("Error syncing WhatsApp branch:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync branch" },
      { status: 500 }
    )
  }
}

