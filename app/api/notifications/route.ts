import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/logger'

// GET - Fetch notifications for specific user
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'userId is required' },
                { status: 400 }
            )
        }

        const notifications = await prisma.notification.findMany({
            where: {
                userId: userId
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50 // Limit to last 50 notifications
        })

        return NextResponse.json({
            success: true,
            notifications,
            unreadCount: notifications.filter((n: any) => !n.isRead).length
        })
    } catch (error) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch notifications' },
            { status: 500 }
        )
    }
}

// POST - Create new notification
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, message, type = 'INFO', userId, link } = body

        if (!title || !message) {
            return NextResponse.json(
                { success: false, error: 'Title and message are required' },
                { status: 400 }
            )
        }

        const notification = await prisma.notification.create({
            data: {
                title,
                message,
                type,
                userId: userId || null,
                link: link || null
            }
        })

        await logActivity({
            action: 'CREATE',
            entityType: 'Notification',
            entityId: notification.id,
            description: `Created notification: ${title}`
        })

        return NextResponse.json({
            success: true,
            notification
        })
    } catch (error) {
        console.error('Error creating notification:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create notification' },
            { status: 500 }
        )
    }
}

// PUT - Mark all as read
export async function PUT() {
    try {
        const result = await prisma.notification.updateMany({
            where: {
                isRead: false
            },
            data: {
                isRead: true
            }
        })

        await logActivity({
            action: 'UPDATE',
            entityType: 'Notification',
            description: `Marked ${result.count} notifications as read`
        })

        return NextResponse.json({
            success: true,
            message: `Marked ${result.count} notifications as read`
        })
    } catch (error) {
        console.error('Error marking notifications as read:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to mark notifications as read' },
            { status: 500 }
        )
    }
}

// DELETE - Clear all notifications
export async function DELETE() {
    try {
        const result = await prisma.notification.deleteMany({})

        await logActivity({
            action: 'DELETE',
            entityType: 'Notification',
            description: `Deleted ${result.count} notifications`
        })

        return NextResponse.json({
            success: true,
            message: `Deleted ${result.count} notifications`
        })
    } catch (error) {
        console.error('Error deleting notifications:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete notifications' },
            { status: 500 }
        )
    }
}
