import { NextRequest, NextResponse } from 'next/server'

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'

// POST - Send WhatsApp message
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validation
        if (!body.phoneNumber || !body.message) {
            return NextResponse.json(
                { success: false, error: 'Phone number and message are required' },
                { status: 400 }
            )
        }

        const response = await fetch(`${WHATSAPP_SERVICE_URL}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error sending WhatsApp message:', error)
        return NextResponse.json(
            { success: false, error: 'WhatsApp service unavailable' },
            { status: 503 }
        )
    }
}
