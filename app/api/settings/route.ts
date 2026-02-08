import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/logger'

// GET - Fetch settings
export async function GET() {
    try {
        // Get first settings record or create default
        let settings = await prisma.settings.findFirst()

        if (!settings) {
            settings = await prisma.settings.create({
                data: {}
            })
        }

        return NextResponse.json({
            success: true,
            settings
        })
    } catch (error) {
        console.error('Error fetching settings:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch settings' },
            { status: 500 }
        )
    }
}

// PUT - Update settings
export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const {
            companyName,
            companyLogo,
            companyDisplayType,
            timezone,
            language,
            newMessagesNotif,
            assignmentNotif,
            templateNotif,
            dailySummaryNotif,
            twoFactorEnabled
        } = body

        // Get or create settings
        let settings = await prisma.settings.findFirst()

        if (!settings) {
            settings = await prisma.settings.create({
                data: {}
            })
        }

        // Prepare update data - only include fields that are provided
        const updateData: any = {}
        
        if (companyName !== undefined) updateData.companyName = companyName
        if (companyLogo !== undefined) updateData.companyLogo = companyLogo
        if (companyDisplayType !== undefined) updateData.companyDisplayType = companyDisplayType
        if (timezone !== undefined) updateData.timezone = timezone
        if (language !== undefined) updateData.language = language
        if (newMessagesNotif !== undefined) updateData.newMessagesNotif = newMessagesNotif
        if (assignmentNotif !== undefined) updateData.assignmentNotif = assignmentNotif
        if (templateNotif !== undefined) updateData.templateNotif = templateNotif
        if (dailySummaryNotif !== undefined) updateData.dailySummaryNotif = dailySummaryNotif
        if (twoFactorEnabled !== undefined) updateData.twoFactorEnabled = twoFactorEnabled

        // Update settings
        const updatedSettings = await prisma.settings.update({
            where: { id: settings.id },
            data: updateData
        })

        await logActivity({
            action: 'UPDATE',
            entityType: 'Settings',
            entityId: updatedSettings.id,
            description: 'Updated system settings'
        })

        return NextResponse.json({
            success: true,
            settings: updatedSettings,
            message: 'Settings updated successfully'
        })
    } catch (error: any) {
        console.error('Error updating settings:', error)
        const errorMessage = error?.message || 'Failed to update settings'
        return NextResponse.json(
            { 
                success: false, 
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
            },
            { status: 500 }
        )
    }
}
