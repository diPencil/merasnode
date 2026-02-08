import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST - Update WhatsApp account status (used by WhatsApp service)
// Prefer accountId so status stays in sync when user scans QR (no phone format mismatch).
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { accountId, phone, status } = body

        if (!status) {
            return NextResponse.json(
                { success: false, error: 'Status is required' },
                { status: 400 }
            )
        }

        if (!['CONNECTED', 'DISCONNECTED', 'WAITING'].includes(status)) {
            return NextResponse.json(
                { success: false, error: 'Invalid status value' },
                { status: 400 }
            )
        }

        const data: { status: string; updatedAt: Date; phone?: string } = {
            status,
            updatedAt: new Date()
        }
        if (phone && status === 'CONNECTED') {
            const normalized = phone.replace(/\D/g, '')
            data.phone = normalized.startsWith('2') ? `+${normalized}` : `+${normalized}`
        }

        if (accountId) {
            const updated = await prisma.whatsAppAccount.updateMany({
                where: { id: accountId },
                data
            })
            if (updated.count === 0) {
                console.warn(`No account found with id ${accountId} for status ${status}`)
            }
            return NextResponse.json({
                success: true,
                message: 'Status updated successfully'
            })
        }

        if (!phone) {
            console.log('Received status update without accountId or phone:', status)
            return NextResponse.json({ success: true, message: 'Status received (no target)' })
        }

        let updateResult = await prisma.whatsAppAccount.updateMany({
            where: { phone },
            data
        })

        if (updateResult.count === 0) {
            const altPhone = phone.startsWith('+') ? phone.slice(1) : `+${phone}`
            updateResult = await prisma.whatsAppAccount.updateMany({
                where: { phone: altPhone },
                data
            })
        }

        if (updateResult.count === 0 && status === 'CONNECTED') {
            try {
                await prisma.whatsAppAccount.create({
                    data: {
                        phone: phone.startsWith('+') ? phone : `+${phone}`,
                        name: body.name || 'WhatsApp User',
                        status: 'CONNECTED',
                        provider: 'whatsapp-web.js'
                    }
                })
            } catch (createError) {
                console.error('Failed to create new account:', createError)
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Status updated successfully'
        })
    } catch (error: any) {
        console.error('Error updating WhatsApp account status:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update status' },
            { status: 500 }
        )
    }
}

// PATCH - Update WhatsApp account status (legacy/specific)
export async function PATCH(request: NextRequest) {
    return POST(request)
}
