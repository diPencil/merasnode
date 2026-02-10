import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/logger"

// GET - جلب القوالب (optional: whatsappAccountId for quick-reply scope; trigger to match triggerKeywords)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const status = searchParams.get('status')
        const whatsappAccountId = searchParams.get('whatsappAccountId') || undefined
        const trigger = searchParams.get('trigger') || undefined

        const where: any = {}
        if (category) where.category = category
        if (status) where.status = status
        if (whatsappAccountId) where.whatsappAccountId = whatsappAccountId

        let templates = await prisma.template.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        })

        // If trigger provided, filter templates whose triggerKeywords contain this trigger (case-insensitive)
        if (trigger && trigger.trim()) {
            const triggerLower = trigger.trim().toLowerCase()
            templates = templates.filter((t) => {
                const keywords = t.triggerKeywords as string[] | null
                if (!keywords || !Array.isArray(keywords)) return false
                return keywords.some((k) => String(k).toLowerCase() === triggerLower || String(k).toLowerCase().includes(triggerLower))
            })
        }

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
                status: body.status || 'PENDING',
                whatsappAccountId: body.whatsappAccountId || null,
                triggerKeywords: body.triggerKeywords != null ? body.triggerKeywords : null
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
