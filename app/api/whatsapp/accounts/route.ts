import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
    requireAuthWithScope,
    requireRoleWithScope,
    unauthorizedResponse,
    forbiddenResponse,
} from '@/lib/api-auth'

// GET - Get WhatsApp accounts (scoped by role)
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)

        // Build where clause based on role
        const where: any = {}
        if (scope.role === 'AGENT') {
            where.id = { in: scope.whatsappAccountIds }
        } else if (scope.role === 'SUPERVISOR') {
            where.branchId = { in: scope.branchIds }
        }
        // ADMIN sees all

        const accounts = await prisma.whatsAppAccount.findMany({
            where,
            include: {
                branch: true,
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Also fetch live status from WhatsApp service
        try {
            const serviceResponse = await fetch('http://localhost:3001/status')
            const serviceData = await serviceResponse.json()

            if (serviceData.success) {
                const enrichedAccounts = accounts.map(account => {
                    const liveStatus = serviceData.accounts.find(
                        (a: any) => a.accountId === account.id
                    )
                    return {
                        ...account,
                        isReady: liveStatus?.isReady || false,
                        liveStatus: liveStatus?.status || 'DISCONNECTED',
                        connectedPhone: liveStatus?.phone
                    }
                })

                return NextResponse.json({
                    success: true,
                    accounts: enrichedAccounts
                })
            }
        } catch (serviceError) {
            console.log('WhatsApp service not available, returning DB data only')
        }

        return NextResponse.json({
            success: true,
            accounts
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse()
        }
        console.error('Error fetching WhatsApp accounts:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch WhatsApp accounts' },
            { status: 500 }
        )
    }
}

// POST - Create new WhatsApp account (ADMIN only)
export async function POST(request: NextRequest) {
    try {
        const scope = await requireRoleWithScope(request, ['ADMIN'])

        const body = await request.json()
        const { name, phone, branchId, provider = 'whatsapp-web.js' } = body

        if (!name || !phone) {
            return NextResponse.json(
                { success: false, error: 'Name and phone are required' },
                { status: 400 }
            )
        }

        const existing = await prisma.whatsAppAccount.findUnique({
            where: { phone }
        })

        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Phone number already exists' },
                { status: 400 }
            )
        }

        const account = await prisma.whatsAppAccount.create({
            data: {
                name,
                phone,
                provider,
                status: 'DISCONNECTED',
                branchId: branchId || null
            }
        })

        return NextResponse.json({ success: true, account }, { status: 201 })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse('Only admins can create WhatsApp accounts')
        }
        console.error('Error creating WhatsApp account:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create WhatsApp account' },
            { status: 500 }
        )
    }
}

// PUT - Update WhatsApp account (ADMIN only)
export async function PUT(request: NextRequest) {
    try {
        const scope = await requireRoleWithScope(request, ['ADMIN'])

        const body = await request.json()
        const { id, name, branchId, userIds } = body

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Account ID is required' },
                { status: 400 }
            )
        }

        const existing = await prisma.whatsAppAccount.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Account not found' },
                { status: 404 }
            )
        }

        const updateData: Record<string, any> = {}
        if ('name' in body) updateData.name = name
        if ('branchId' in body) updateData.branchId = branchId || null

        // Handle user assignment (many-to-many)
        if ('userIds' in body && Array.isArray(userIds)) {
            updateData.users = {
                set: userIds.map((uid: string) => ({ id: uid })),
            }
        }

        const account = await prisma.whatsAppAccount.update({
            where: { id },
            data: updateData,
            include: {
                branch: true,
                users: { select: { id: true, name: true, email: true } },
            },
        })

        return NextResponse.json({ success: true, account })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse('Only admins can update WhatsApp accounts')
        }
        console.error('Error updating WhatsApp account:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update WhatsApp account' },
            { status: 500 }
        )
    }
}

// DELETE - Remove WhatsApp account (ADMIN only)
export async function DELETE(request: NextRequest) {
    try {
        const scope = await requireRoleWithScope(request, ['ADMIN'])

        const id = request.nextUrl.searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Account ID is required' },
                { status: 400 }
            )
        }

        // Try to disconnect from live service first
        try {
            await fetch(`http://localhost:3001/disconnect/${id}`, { method: 'POST' })
        } catch (e) {
            console.log('Could not disconnect from live service, proceeding with DB deletion')
        }

        await prisma.whatsAppAccount.delete({ where: { id } })

        return NextResponse.json({
            success: true,
            message: 'Account deleted successfully'
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return unauthorizedResponse()
            if (error.message === 'Forbidden') return forbiddenResponse('Only admins can delete WhatsApp accounts')
        }
        console.error('Error deleting WhatsApp account:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete WhatsApp account' },
            { status: 500 }
        )
    }
}
