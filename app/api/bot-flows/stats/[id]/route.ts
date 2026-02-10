import { NextRequest, NextResponse } from 'next/server'
import { startOfDay, subDays, format, eachDayOfInterval } from 'date-fns'
import { prisma } from '@/lib/db'
import { requireAuthWithScope, unauthorizedResponse } from '@/lib/api-auth'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params

        // ── Auth + RBAC ──
        const scope = await requireAuthWithScope(request)

        // Build scope filter for flow interactions based on role
        const interactionScope: Record<string, any> = { flowId: id }
        if (scope.role === 'SUPERVISOR') {
            interactionScope.contact = { branchId: { in: scope.branchIds } }
        } else if (scope.role === 'AGENT') {
            interactionScope.contact = { branchId: { in: scope.branchIds } }
        }
        // ADMIN: no extra filter

        // 1. Get basic counts — scoped
        const totalInteractions = await prisma.flowInteraction.count({
            where: interactionScope
        })

        const completions = await prisma.flowInteraction.count({
            where: { ...interactionScope, action: 'COMPLETED' }
        })

        const clicks = await prisma.flowInteraction.count({
            where: { ...interactionScope, action: 'STEP' }
        })

        const conversionRate = totalInteractions > 0
            ? Math.round((completions / totalInteractions) * 100)
            : 0

        // 2. Performance Data (Last 7 days)
        const startDate = startOfDay(subDays(new Date(), 6))
        const interactionsLastWeek = await prisma.flowInteraction.findMany({
            where: {
                ...interactionScope,
                createdAt: { gte: startDate }
            },
            select: {
                createdAt: true,
                action: true
            }
        })

        const days = eachDayOfInterval({
            start: startDate,
            end: new Date()
        })

        const performanceData = days.map(day => {
            const dayStr = format(day, 'EEE')
            const dayInteractions = interactionsLastWeek.filter((i: any) =>
                format(i.createdAt, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
            )

            return {
                name: dayStr,
                messages: dayInteractions.length,
                completions: dayInteractions.filter((i: any) => i.action === 'COMPLETED').length
            }
        })

        // 3. Drop-off Data
        // Get distinct interaction counts per stepIndex
        const stepStats = await prisma.flowInteraction.groupBy({
            by: ['stepIndex'],
            where: interactionScope,
            _count: { _all: true },
            orderBy: { stepIndex: 'asc' }
        })

        // Get the flow steps to map indices to names
        const botFlow = await prisma.botFlow.findUnique({
            where: { id },
            select: { steps: true }
        })

        const steps = botFlow?.steps as any[] || []
        const dropOffData = steps.map((step, index) => ({
            step: step.title || `Step ${index + 1}`,
            count: stepStats.find((s: any) => s.stepIndex === index)?._count?._all || 0
        }))

        // 4. Recent Activity
        const recentInteractions = await prisma.flowInteraction.findMany({
            where: interactionScope,
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                contact: {
                    select: { name: true }
                }
            }
        })

        const recentActivity = recentInteractions.map((i: any) => ({
            id: i.id,
            contact: i.contact.name,
            date: format(i.createdAt, 'MMM d, h:mm a'),
            status: i.action === 'COMPLETED' ? 'Completed' : i.action === 'TRIGGERED' ? 'Started' : 'In Progress',
            step: steps[i.stepIndex]?.title || `Step ${i.stepIndex + 1}`
        }))

        return NextResponse.json({
            stats: {
                messagesReceived: totalInteractions,
                filesSent: completions,
                clicks,
                conversionRate
            },
            performanceData,
            dropOffData,
            recentActivity
        })

    } catch (error: any) {
        if (error?.message === 'Unauthorized') return unauthorizedResponse()
        console.error('Error fetching flow stats:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
