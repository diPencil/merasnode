import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/logger'

// GET - Get user profile
export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const currentUser = await requireAuth(request)
        
        // Fetch full user profile from database
        const user = await prisma.user.findUnique({
            where: { id: currentUser.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                branches: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                whatsappAccounts: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                }
            }
        })
        
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            profile: {
                ...user,
                avatar: '/favicon.png' // Default avatar for now
            }
        })
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return unauthorizedResponse()
        }
        
        console.error('Error fetching profile:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
    try {
        // Authenticate user
        const currentUser = await requireAuth(request)
        
        const body = await request.json()
        const { name } = body

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Name is required' },
                { status: 400 }
            )
        }

        // Update user in database
        const updatedUser = await prisma.user.update({
            where: { id: currentUser.userId },
            data: { name },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                branches: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                whatsappAccounts: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                }
            }
        })

        await logActivity({
            action: 'UPDATE',
            entityType: 'Profile',
            description: `Updated profile: ${name}`
        })

        return NextResponse.json({
            success: true,
            profile: {
                ...updatedUser,
                avatar: '/favicon.png'
            },
            message: 'Profile updated successfully'
        })
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return unauthorizedResponse()
        }
        
        console.error('Error updating profile:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update profile' },
            { status: 500 }
        )
    }
}
