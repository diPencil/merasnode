import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const WHATSAPP_SERVICE_URL = 'http://localhost:3001'

// GET - Get WhatsApp connection status and QR code
export async function GET() {
    try {
        const response = await fetch(`${WHATSAPP_SERVICE_URL}/status`)
        const data = await response.json()

        // Get first account from database
        const account = await prisma.whatsAppAccount.findFirst({
            orderBy: { createdAt: 'desc' }
        })

        // If we have accounts, get detailed status
        let detailedStatus = null
        if (account) {
            try {
                const statusRes = await fetch(`${WHATSAPP_SERVICE_URL}/status/${account.id}`)
                detailedStatus = await statusRes.json()
                // Sync DB when service says connected but DB might be stale (e.g. after restart or old bug)
                if (detailedStatus?.success && detailedStatus?.isReady && account.id) {
                    await prisma.whatsAppAccount.updateMany({
                        where: { id: account.id },
                        data: { status: 'CONNECTED', updatedAt: new Date() }
                    })
                }
            } catch (err) {
                console.error('Error getting detailed status:', err)
            }
        }

        // Format accounts with accountId
        const formattedAccounts = (data.accounts || []).map((acc: any) => ({
            ...acc,
            accountId: account?.id // Add database account ID
        }))

        return NextResponse.json({
            success: data.success,
            isReady: detailedStatus?.isReady || false,
            qrCode: detailedStatus?.qrCode || null,
            status: detailedStatus?.status || 'DISCONNECTED',
            userInfo: detailedStatus?.phone ? {
                name: account?.name || 'Unknown',
                phone: detailedStatus.phone,
                accountId: account?.id
            } : null,
            accounts: formattedAccounts
        })
    } catch (error: any) {
        console.error('Error getting WhatsApp status:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'WhatsApp service unavailable',
                isReady: false,
                hasQR: false
            },
            { status: 503 }
        )
    }
}

// POST - Initialize WhatsApp connection
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { action } = body

        // Get or create default account
        let account = await prisma.whatsAppAccount.findFirst({
            orderBy: { createdAt: 'desc' }
        })

        // If no account exists, create a default one
        if (!account) {
            account = await prisma.whatsAppAccount.create({
                data: {
                    name: 'Default Account',
                    phone: '',
                    provider: 'whatsapp-web',
                    status: 'DISCONNECTED'
                }
            })
        }

        // Initialize the account
        const response = await fetch(`${WHATSAPP_SERVICE_URL}/initialize/${account.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: account.phone || '',
                force: true
            })
        })

        const data = await response.json()

        if (data.success) {
            await prisma.whatsAppAccount.update({
                where: { id: account.id },
                data: { status: 'WAITING' }
            })
            return NextResponse.json({
                success: true,
                message: data.message || 'Initialization started',
                accountId: account.id
            })
        }

        return NextResponse.json({
            success: false,
            error: data.error || 'خدمة الواتساب رفضت الطلب',
            accountId: account.id
        }, { status: 400 })
    } catch (error: any) {
        console.error('Error initializing WhatsApp:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'تعذر الاتصال بخدمة الواتساب (تأكد أن البورت 3001 شغال)' },
            { status: 503 }
        )
    }
}
