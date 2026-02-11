import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/logger"
import {
    requireAuthWithScope,
    unauthorizedResponse,
    forbiddenResponse,
} from "@/lib/api-auth"

// GET - Fetch contacts (scoped by branch)
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)

        // Build where clause based on role (aligned with dashboard stats logic)
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
                return NextResponse.json({
                    success: true,
                    data: [],
                    count: 0
                })
            }

            where = orClauses.length === 1 ? orClauses[0] : { OR: orClauses }
        } else {
            // AGENT: contacts that have at least one conversation assigned to this agent
            // This matches the dashboard's contact visibility
            where = {
                conversations: { some: { assignedToId: scope.userId } }
            }
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
