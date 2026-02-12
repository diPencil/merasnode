import { NextRequest, NextResponse } from 'next/server'
import { authenticatedFetch } from '@/lib/auth'

const WHATSAPP_SERVICE_URL = 'http://localhost:3001'

/**
 * GET /api/whatsapp/group
 * Fetch group info including participants
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

        const response = await fetch(`${WHATSAPP_SERVICE_URL}/group/${accountId}/${groupId}`)

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to fetch group info from service')
        }

        const data = await response.json()

        return NextResponse.json({
            success: true,
            group: data.group
        })
    } catch (error) {
        console.error('Error in group info API:', error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
