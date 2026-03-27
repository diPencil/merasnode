import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"
import { hasPermission } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"

/**
 * GET /api/tags
 * Returns unique tag strings from:
 * - contacts the user can see (contact.tags)
 * - offers the user can see (offer.tagToAssign)
 * Used for "Tag to assign when sending" dropdown in offer form.
 */
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const role = scope.role as UserRole
        if (!hasPermission(role, "view_offers")) {
            return forbiddenResponse("You do not have permission to view offers.")
        }

        const tagSet = new Set<string>()

        // Contact where (same logic as GET /api/contacts, without tag filter)
        let contactWhere: any = {}
        if (scope.role === "ADMIN") {
            contactWhere = {}
        } else if (scope.role === "SUPERVISOR") {
            const hasBranchScope = scope.branchIds?.length
            const hasWaScope = scope.whatsappAccountIds?.length
            const orClauses: any[] = []
            if (hasBranchScope) orClauses.push({ branchId: { in: scope.branchIds } })
            if (hasWaScope) {
                orClauses.push({
                    conversations: {
                        some: {
                            messages: {
                                some: { whatsappAccountId: { in: scope.whatsappAccountIds } },
                            },
                        },
                    },
                })
            }
            if (orClauses.length === 0) {
                return NextResponse.json({ success: true, data: [] })
            }
            contactWhere = orClauses.length === 1 ? orClauses[0] : { OR: orClauses }
        } else {
            const hasBranchScope = scope.branchIds?.length
            const hasWaScope = scope.whatsappAccountIds?.length
            const orClauses: any[] = [{ conversations: { some: { assignedToId: scope.userId } } }]
            if (hasBranchScope) orClauses.push({ branchId: { in: scope.branchIds } })
            if (hasWaScope) {
                orClauses.push({
                    conversations: {
                        some: {
                            messages: {
                                some: { whatsappAccountId: { in: scope.whatsappAccountIds } },
                            },
                        },
                    },
                })
            }
            contactWhere = { OR: orClauses }
        }

        const [contacts, offers] = await Promise.all([
            prisma.contact.findMany({
                where: contactWhere,
                select: { tags: true },
                take: 500,
            }),
            prisma.offer.findMany({
                where:
                    role === "ADMIN"
                        ? {}
                        : scope.whatsappAccountIds?.length
                          ? { whatsappAccountId: { in: scope.whatsappAccountIds } }
                          : { id: "impossible" },
                select: { tagToAssign: true },
            }),
        ])

        for (const c of contacts) {
            if (!c.tags) continue
            const arr = Array.isArray(c.tags) ? (c.tags as string[]) : [String(c.tags)]
            for (const t of arr) {
                const s = String(t).trim()
                if (s) tagSet.add(s)
            }
        }
        for (const o of offers) {
            if (o.tagToAssign?.trim()) tagSet.add(o.tagToAssign.trim())
        }

        const data = Array.from(tagSet).sort((a, b) => a.localeCompare(b, "ar"))
        return NextResponse.json({ success: true, data })
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error("Error fetching tags:", e)
        return NextResponse.json(
            { success: false, error: "Failed to fetch tags" },
            { status: 500 }
        )
    }
}
