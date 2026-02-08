import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/logger"

// GET - جلب جميع القوالب
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const status = searchParams.get('status')

        const where: any = {}
        if (category) where.category = category
        if (status) where.status = status

        const templates = await prisma.template.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        })

        // Extract variables from content dynamically
        const templatesWithVariables = templates.map(t => {
            const variables = t.content.match(/{{([^}]+)}}/g)?.map(v => v.replace(/{{|}}/g, '')) || []
            // Remove duplicates
            const uniqueVariables = [...new Set(variables)]
            return {
                ...t,
                variables: uniqueVariables
            }
        })

        return NextResponse.json({
            success: true,
            data: templatesWithVariables,
            count: templates.length
        })
    } catch (error) {
        console.error('Error fetching templates:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch templates"
            },
            { status: 500 }
        )
    }
}

// POST - إنشاء قالب جديد
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        if (!body.name || !body.content || !body.category || !body.language) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Name, content, category, and language are required"
                },
                { status: 400 }
            )
        }

        const template = await prisma.template.create({
            data: {
                name: body.name,
                content: body.content,
                category: body.category || null,
                language: body.language || 'en',
                status: body.status || 'PENDING'
            }
        })

        // Log activity
        await logActivity({
            action: "CREATE",
            entityType: "Template",
            entityId: template.id,
            newValues: {
                name: template.name,
                category: template.category
            },
            description: `Created new template: ${template.name}`
        })
        return NextResponse.json({
            success: true,
            data: template
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating template:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to create template"
            },
            { status: 500 }
        )
    }
}
