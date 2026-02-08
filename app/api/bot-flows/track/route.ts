import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { flowId, contactId, action, stepIndex, metadata } = body

        if (!flowId || !contactId || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const interaction = await prisma.flowInteraction.create({
            data: {
                flowId,
                contactId,
                action,
                stepIndex: stepIndex || 0,
                metadata: metadata || {}
            }
        })

        return NextResponse.json({ success: true, interaction })
    } catch (error) {
        console.error('Error tracking flow interaction:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
