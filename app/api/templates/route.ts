import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/logger"
import { requireAuthWithScope, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth"

// GET - جلب القوالب (center-scoped: non-Admin only see templates for their WhatsApp accounts)
export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const status = searchParams.get('status')
        const whatsappAccountIdParam = searchParams.get('whatsappAccountId') || undefined
        const trigger = searchParams.get('trigger') || undefined

        const where: any = {}
        if (category) where.category = category
        if (status) where.status = status
        if (whatsappAccountIdParam) where.whatsappAccountId = whatsappAccountIdParam

        if (scope.role !== 'ADMIN') {
            if (!scope.whatsappAccountIds || scope.whatsappAccountIds.length === 0) {
                return NextResponse.json({ success: true, data: [], count: 0 })
            }
            where.whatsappAccountId = { in: scope.whatsappAccountIds }
        }

        let templates = await prisma.template.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { id: true, name: true } } },
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
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error('Error fetching templates:', e)
        return NextResponse.json(
            { success: false, error: "Failed to fetch templates" },
            { status: 500 }
        )
    }
}

// POST - إنشاء قالب جديد (center-scoped: non-Admin must use an assigned WhatsApp account)
export async function POST(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)
        const body = await request.json()

        if (!body.name || !body.content || !body.category || !body.language) {
            return NextResponse.json(
                { success: false, error: "Name, content, category, and language are required" },
                { status: 400 }
            )
        }

        let whatsappAccountId: string | null = body.whatsappAccountId || null
        if (scope.role !== 'ADMIN') {
            if (!scope.whatsappAccountIds?.length) {
                return forbiddenResponse("You do not have any assigned WhatsApp accounts for templates.")
            }
            if (whatsappAccountId && !scope.whatsappAccountIds.includes(whatsappAccountId)) {
                return forbiddenResponse("You cannot create templates for this WhatsApp account.")
            }
            if (!whatsappAccountId && scope.whatsappAccountIds.length === 1) {
                whatsappAccountId = scope.whatsappAccountIds[0]
            }
        }

        const template = await prisma.template.create({
            data: {
                name: body.name,
                content: body.content,
                category: body.category || null,
                language: body.language || 'en',
                status: body.status || 'PENDING',
                whatsappAccountId,
                createdById: scope.userId,
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
    } catch (e) {
        if (e instanceof Error && e.message === "Unauthorized") return unauthorizedResponse()
        if (e instanceof Error && e.message === "Forbidden") return forbiddenResponse()
        console.error('Error creating template:', e)
        return NextResponse.json(
            { success: false, error: "Failed to create template" },
            { status: 500 }
        )
    }
}
