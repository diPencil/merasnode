import { NextRequest, NextResponse } from 'next/server'

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'

/**
 * GET /api/whatsapp/group
 * Fetch group info including participants
 * accountId and groupId must be URL-encoded in query (groupId contains @)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const accountId = searchParams.get('accountId')
        const groupId = searchParams.get('groupId')

        if (!accountId || !groupId) {
            return NextResponse.json(
                { success: false, error: 'accountId and groupId are required' },
                { status: 400 }
            )
        }

        const url = `${WHATSAPP_SERVICE_URL}/group/${encodeURIComponent(accountId)}/${encodeURIComponent(groupId)}`
        const response = await fetch(url)

        const responseText = await response.text()
        let data: { success?: boolean; group?: any; error?: string }
        try {
            data = responseText ? JSON.parse(responseText) : {}
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid response from WhatsApp service' },
                { status: 502 }
            )
        }

        if (!response.ok) {
            const errMsg = data.error || data.message || responseText?.slice(0, 200) || `HTTP ${response.status}`
            console.error('WhatsApp group API error:', errMsg)
            return NextResponse.json(
                { success: false, error: errMsg },
                { status: response.status >= 500 ? 502 : 400 }
            )
        }

        return NextResponse.json({
            success: true,
            group: data.group || { participants: [], participantsCount: 0 }
        })
    } catch (error) {
        console.error('Error in group info API:', error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
