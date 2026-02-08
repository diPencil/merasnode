import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/logger'
import crypto from 'crypto'

// GET - Fetch all API keys
export async function GET() {
    try {
        const apiKeys = await prisma.apiKey.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json({
            success: true,
            apiKeys
        })
    } catch (error) {
        console.error('Error fetching API keys:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch API keys' },
            { status: 500 }
        )
    }
}

// POST - Create new API key
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, expiresInDays } = body

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Name is required' },
                { status: 400 }
            )
        }

        // Generate random API key
        const key = `mk_${crypto.randomBytes(32).toString('hex')}`

        // Calculate expiration date
        const expiresAt = expiresInDays
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : null

        const apiKey = await prisma.apiKey.create({
            data: {
                name,
                key,
                expiresAt
            }
        })

        await logActivity({
            action: 'CREATE',
            entityType: 'ApiKey',
            entityId: apiKey.id,
            description: `Created API key: ${name}`
        })

        return NextResponse.json({
            success: true,
            apiKey
        })
    } catch (error) {
        console.error('Error creating API key:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create API key' },
            { status: 500 }
        )
    }
}

// DELETE - Delete API key
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            )
        }

        await prisma.apiKey.delete({
            where: { id }
        })

        await logActivity({
            action: 'DELETE',
            entityType: 'ApiKey',
            entityId: id,
            description: 'Deleted API key'
        })

        return NextResponse.json({
            success: true,
            message: 'API key deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting API key:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete API key' },
            { status: 500 }
        )
    }
}
