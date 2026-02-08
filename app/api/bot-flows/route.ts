import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET - جلب جميع Bot Flows
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const isActive = searchParams.get('active')

        const where: any = {}
        if (isActive !== null) where.isActive = isActive === 'true'

        const botFlows = await prisma.botFlow.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            success: true,
            data: botFlows,
            count: botFlows.length
        })
    } catch (error) {
        console.error('Error fetching bot flows:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch bot flows"
            },
            { status: 500 }
        )
    }
}

// POST - إنشاء Bot Flow جديد
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        if (!body.name || !body.trigger || !body.steps) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Name, trigger, and steps are required"
                },
                { status: 400 }
            )
        }

        const botFlow = await prisma.botFlow.create({
            data: {
                name: body.name,
                description: body.description || null,
                trigger: body.trigger,
                steps: body.steps,
                isActive: body.isActive !== undefined ? body.isActive : true
            }
        })

        return NextResponse.json({
            success: true,
            data: botFlow
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating bot flow:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to create bot flow"
            },
            { status: 500 }
        )
    }
}

// PATCH - تحديث Bot Flow
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()

        if (!body.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Bot Flow ID is required"
                },
                { status: 400 }
            )
        }

        const updateData: any = {}
        if (body.isActive !== undefined) updateData.isActive = body.isActive
        if (body.name) updateData.name = body.name
        if (body.description !== undefined) updateData.description = body.description
        if (body.trigger) updateData.trigger = body.trigger
        if (body.steps) updateData.steps = body.steps

        const botFlow = await prisma.botFlow.update({
            where: { id: body.id },
            data: updateData
        })

        return NextResponse.json({
            success: true,
            data: botFlow
        })
    } catch (error) {
        console.error('Error updating bot flow:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to update bot flow"
            },
            { status: 500 }
        )
    }
}