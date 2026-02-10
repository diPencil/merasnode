import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// POST - Create an activity log entry
// This endpoint intentionally does NOT require auth because it is called
// during login/logout flows where the user may not have a valid token yet.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, action, entityType, entityId, ipAddress, userAgent, metadata } = body

        if (!action || !entityType) {
            return NextResponse.json(
                { success: false, error: "Action and entityType are required" },
                { status: 400 }
            )
        }

        await prisma.log.create({
            data: {
                userId: userId || null,
                action,
                entityType,
                entityId: entityId || null,
                ipAddress: ipAddress || 'unknown',
                userAgent: userAgent || 'unknown',
                metadata: metadata || {}
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error creating log:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create log' },
            { status: 500 }
        )
    }
}
