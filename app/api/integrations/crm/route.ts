import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/logger'

// GET - Fetch all CRM integrations
export async function GET() {
    try {
        const integrations = await prisma.crmIntegration.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json({
            success: true,
            integrations
        })
    } catch (error) {
        console.error('Error fetching CRM integrations:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch integrations' },
            { status: 500 }
        )
    }
}

// POST - Create new CRM integration
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { provider, apiKey, apiSecret } = body

        if (!provider || !apiKey) {
            return NextResponse.json(
                { success: false, error: 'Provider and API key are required' },
                { status: 400 }
            )
        }

        const integration = await prisma.crmIntegration.create({
            data: {
                provider,
                apiKey,
                apiSecret: apiSecret || null
            }
        })

        await logActivity({
            action: 'CREATE',
            entityType: 'CrmIntegration',
            entityId: integration.id,
            description: `Connected CRM: ${provider}`
        })

        return NextResponse.json({
            success: true,
            integration
        })
    } catch (error) {
        console.error('Error creating CRM integration:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create integration' },
            { status: 500 }
        )
    }
}

// PUT - Update CRM integration
export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, isActive } = body

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            )
        }

        const integration = await prisma.crmIntegration.update({
            where: { id },
            data: {
                isActive,
                lastSyncAt: isActive ? new Date() : undefined
            }
        })

        await logActivity({
            action: 'UPDATE',
            entityType: 'CrmIntegration',
            entityId: id,
            description: `${isActive ? 'Activated' : 'Deactivated'} CRM integration`
        })

        return NextResponse.json({
            success: true,
            integration
        })
    } catch (error) {
        console.error('Error updating CRM integration:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update integration' },
            { status: 500 }
        )
    }
}

// DELETE - Delete CRM integration
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            )
        }

        await prisma.crmIntegration.delete({
            where: { id }
        })

        await logActivity({
            action: 'DELETE',
            entityType: 'CrmIntegration',
            entityId: id,
            description: 'Deleted CRM integration'
        })

        return NextResponse.json({
            success: true,
            message: 'Integration deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting integration:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete integration' },
            { status: 500 }
        )
    }
}
