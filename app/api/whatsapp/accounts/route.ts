import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Get all WhatsApp accounts
export async function GET() {
    try {
        const accounts = await prisma.whatsAppAccount.findMany({
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
                // Merge database data with live service status
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
        console.error('Error fetching WhatsApp accounts:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch WhatsApp accounts'
            },
            { status: 500 }
        )
    }
}

// POST - Create new WhatsApp account
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, phone, branchId, provider = 'whatsapp-web.js' } = body

        // Validate
        if (!name || !phone) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Name and phone are required'
                },
                { status: 400 }
            )
        }

        // Check if phone already exists
        const existing = await prisma.whatsAppAccount.findUnique({
            where: { phone }
        })

        if (existing) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Phone number already exists'
                },
                { status: 400 }
            )
        }

        // Create account
        const account = await prisma.whatsAppAccount.create({
            data: {
                name,
                phone,
                provider,
                status: 'DISCONNECTED',
                branchId: branchId || null
            }
        })

        return NextResponse.json({
            success: true,
            account
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating WhatsApp account:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to create WhatsApp account'
            },
            { status: 500 }
        )
    }
}

// DELETE - Remove WhatsApp account
export async function DELETE(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Account ID is required' },
                { status: 400 }
            )
        }

        // Try to disconnect from live service first (ignore errors if service is down)
        try {
            await fetch(`http://localhost:3001/disconnect/${id}`, { method: 'POST' })
        } catch (e) {
            console.log('Could not disconnect from live service, proceedings with DB deletion')
        }

        await prisma.whatsAppAccount.delete({
            where: { id }
        })

        return NextResponse.json({
            success: true,
            message: 'Account deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting WhatsApp account:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to delete WhatsApp account'
            },
            { status: 500 }
        )
    }
}
