import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/logger"
import {
    requireAuthWithScope,
    unauthorizedResponse,
    forbiddenResponse,
} from "@/lib/api-auth"

// GET - Fetch contacts (center-scoped; optional tag filter)
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const { searchParams } = new URL(request.url)
        const tagFilter = searchParams.get('tag')?.trim() || undefined
        const categoryId = searchParams.get('categoryId')?.trim() || undefined

        let where: any = {}

        if (scope.role === 'ADMIN') {
            where = {}
        } else if (scope.role === 'SUPERVISOR') {
            const hasBranchScope = scope.branchIds && scope.branchIds.length > 0
            const hasWaScope = scope.whatsappAccountIds && scope.whatsappAccountIds.length > 0

            const orClauses: any[] = []
            if (hasBranchScope) {
                orClauses.push({ branchId: { in: scope.branchIds } })
            }
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
                return NextResponse.json({ success: true, data: [], count: 0 })
            }
            where = orClauses.length === 1 ? orClauses[0] : { OR: orClauses }
        } else {
            // AGENT: center-specific — contacts belonging to their branch(s) or WA account(s) or assigned to them
            const hasBranchScope = scope.branchIds && scope.branchIds.length > 0
            const hasWaScope = scope.whatsappAccountIds && scope.whatsappAccountIds.length > 0
            const orClauses: any[] = [
                { conversations: { some: { assignedToId: scope.userId } } },
            ]
            if (hasBranchScope) {
                orClauses.push({ branchId: { in: scope.branchIds } })
            }
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
            where = { OR: orClauses }
        }

        // Filter by offer category: only contacts whose branch is in this category's branches
        if (categoryId) {
            const category = await prisma.offerCategory.findUnique({
                where: { id: categoryId },
                include: { branches: { select: { branchId: true } } },
            })
            const branchIds = category?.branches?.map((b) => b.branchId) ?? []
            if (branchIds.length === 0) {
                return NextResponse.json({ success: true, data: [], count: 0 })
            }
            where = { AND: [where, { branchId: { in: branchIds } }] }
        }

        if (tagFilter) {
            where.AND = where.AND || []
            where.AND.push({
                OR: [
                    { tags: { path: '$', equals: tagFilter } },
                    { tags: { string_contains: tagFilter } },
                ],
            })
            // MySQL JSON: simpler approach — filter in memory or use JsonFilter
            delete where.AND
            const baseWhere = { ...where }
            const contactsAll = await prisma.contact.findMany({
                where: baseWhere,
                orderBy: { createdAt: 'desc' },
            })
            const contacts = contactsAll.filter((c) => {
                const tags = c.tags
                if (!tags) return false
                const arr = Array.isArray(tags) ? (tags as string[]) : [String(tags)]
                return arr.some((t) => String(t).trim().toLowerCase() === tagFilter.toLowerCase())
            })
            return NextResponse.json({ success: true, data: contacts, count: contacts.length })
        }

        const contacts = await prisma.contact.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            success: true,
            data: contacts,
            count: contacts.length
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse()
        }
        console.error('Error fetching contacts:', error)
        return NextResponse.json(
            { success: false, error: "Failed to fetch contacts" },
            { status: 500 }
        )
    }
}

// POST - Create contact (auth required, auto-assigns branch from user scope)
export async function POST(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const body = await request.json()

        // Check for bulk import (array) — Admin only
        if (Array.isArray(body)) {
            if (scope.role !== 'ADMIN') {
                return forbiddenResponse('Only Admin can import contacts')
            }
            // Determine default branchId for bulk imports
            const defaultBranchId = scope.branchIds?.length > 0 ? scope.branchIds[0] : null

            const validContacts = body.filter((c: any) => c.name && c.phone).map((c: any) => ({
                name: c.name,
                phone: String(c.phone),
                email: c.email || null,
                tags: c.tags ? (Array.isArray(c.tags) ? c.tags.join(',') : c.tags) : null,
                notes: c.notes || null,
                branchId: c.branchId || defaultBranchId,
                createdAt: new Date(),
                updatedAt: new Date()
            }))

            if (validContacts.length === 0) {
                return NextResponse.json(
                    { success: false, error: "No valid contacts found" },
                    { status: 400 }
                )
            }

            const result = await prisma.contact.createMany({
                data: validContacts,
                skipDuplicates: true
            })

            await logActivity({
                userId: scope.userId,
                action: "BULK_CREATE",
                entityType: "Contact",
                entityId: "bulk",
                description: `Imported ${result.count} contacts`
            })

            return NextResponse.json({
                success: true,
                count: result.count,
                message: `Successfully imported ${result.count} contacts`
            }, { status: 201 })
        }

        // Single contact creation
        if (!body.name || !body.phone) {
            return NextResponse.json(
                { success: false, error: "Name and phone are required" },
                { status: 400 }
            )
        }

        // Auto-assign branch from user scope if not explicitly provided
        let branchId = body.branchId || null
        if (!branchId && scope.role !== 'ADMIN' && scope.branchIds.length > 0) {
            branchId = scope.branchIds[0]
        }

        // Non-admin: verify the branchId is within their scope
        if (branchId && scope.role !== 'ADMIN' && !scope.branchIds.includes(branchId)) {
            return forbiddenResponse('You do not have access to this branch')
        }

        const contact = await prisma.contact.create({
            data: {
                name: body.name,
                phone: body.phone,
                email: body.email || null,
                tags: body.tags && body.tags.length > 0 ? body.tags : null,
                notes: body.notes || null,
                followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
                branchId,
            }
        })

        await logActivity({
            userId: scope.userId,
            action: "CREATE",
            entityType: "Contact",
            entityId: contact.id,
            newValues: {
                name: contact.name,
                phone: contact.phone,
                email: contact.email
            },
            description: `Created new contact: ${contact.name}`
        })

        // Trigger bot flows for new contact
        try {
            await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3003'}/api/bot-flows/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    triggerType: 'new_contact',
                    context: {
                        contactId: contact.id,
                        contactName: contact.name,
                        contactPhone: contact.phone,
                        contactEmail: contact.email
                    }
                })
            })
        } catch (triggerError) {
            console.error('Error triggering bot flows:', triggerError)
        }

        return NextResponse.json({
            success: true,
            data: contact
        }, { status: 201 })
    } catch (error: any) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse()
        }
        console.error('Error creating contact:', error)

        if (error.code === 'P2002') {
            return NextResponse.json(
                { success: false, error: "Phone number already exists" },
                { status: 409 }
            )
        }

        return NextResponse.json(
            { success: false, error: "Failed to create contact" },
            { status: 500 }
        )
    }
}

// DELETE - Bulk delete contacts
export async function DELETE(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const body = await request.json()

        if (!Array.isArray(body.ids) || body.ids.length === 0) {
            return NextResponse.json(
                { success: false, error: "No contact IDs provided" },
                { status: 400 }
            )
        }

        if (scope.role !== 'ADMIN') {
            return forbiddenResponse("Only Admins can perform bulk deletion")
        }

        const result = await prisma.contact.deleteMany({
            where: {
                id: { in: body.ids }
            }
        })

        await logActivity({
            action: "BULK_DELETE",
            entityType: "Contact",
            entityId: "bulk",
            description: `Deleted ${result.count} contacts`
        })

        return NextResponse.json({
            success: true,
            count: result.count,
            message: `Successfully deleted ${result.count} contacts`
        })

    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
        }
        console.error('Error deleting contacts:', error)
        return NextResponse.json(
            { success: false, error: "Failed to delete contacts" },
            { status: 500 }
        )
    }
}
