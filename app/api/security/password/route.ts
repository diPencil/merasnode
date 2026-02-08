import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/logger'
import bcrypt from 'bcryptjs'

// POST - Change password
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { currentPassword, newPassword } = body

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, error: 'Current password and new password are required' },
                { status: 400 }
            )
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { success: false, error: 'Password must be at least 8 characters long' },
                { status: 400 }
            )
        }

        // Get user from request (you should pass userId in the request body)
        const { userId } = body

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID is required' },
                { status: 400 }
            )
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            )
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, error: 'Current password is incorrect' },
                { status: 401 }
            )
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update password in database
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        })

        await logActivity({
            action: 'UPDATE',
            entityType: 'Security',
            description: 'Password changed',
            userId: userId
        })

        return NextResponse.json({
            success: true,
            message: 'Password changed successfully'
        })
    } catch (error) {
        console.error('Error changing password:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to change password' },
            { status: 500 }
        )
    }
}
