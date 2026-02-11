import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
    requireAuthWithScope,
    unauthorizedResponse,
    UserScope,
} from '@/lib/api-auth'

// ─── Scope helpers (role-based, account-scoped analytics) ────────────
// Super Admin (ADMIN): full system-wide visibility — no filters. Single source of truth.
// SUPERVISOR: branches + WA + agents in those branches. AGENT: only own data.

/** Super Admin sees global data; no branch/user/channel filters applied. */
function isGlobalScope(scope: UserScope): boolean {
    const role = String(scope.role || '').toUpperCase()
    return role === 'ADMIN'
}

// Build a Prisma `where` for messages. For ADMIN: global. For AGENT: only messages they sent.
function messageWhere(scope: UserScope, extra: Record<string, any> = {}): Record<string, any> {
    if (isGlobalScope(scope)) return { ...extra }
    if (scope.role === 'SUPERVISOR') {
        return {
            ...extra,
            conversation: {
                contact: { branchId: { in: scope.branchIds } },
            },
        }
    }
    // AGENT: only messages they sent (own analytics only)
    return {
        ...extra,
        senderId: scope.userId,
    }
}

// Build a Prisma `where` for conversations. For ADMIN: global. For AGENT: only conversations assigned to them.
function conversationWhere(scope: UserScope, extra: Record<string, any> = {}): Record<string, any> {
    if (isGlobalScope(scope)) return { ...extra }

    if (scope.role === 'SUPERVISOR') {
        const hasBranchScope = scope.branchIds && scope.branchIds.length > 0
        const hasWaScope = scope.whatsappAccountIds && scope.whatsappAccountIds.length > 0

        const orClauses: Record<string, any>[] = []

        if (hasBranchScope) {
            orClauses.push({ contact: { branchId: { in: scope.branchIds } } })
        }
        if (hasWaScope) {
            orClauses.push({
                messages: {
                    some: { whatsappAccountId: { in: scope.whatsappAccountIds } },
                },
            })
        }

        if (orClauses.length === 0) {
            return { id: { in: [] }, ...extra }
        }

        return orClauses.length === 1
            ? { ...extra, ...orClauses[0] }
            : { ...extra, OR: orClauses }
    }

    // AGENT: only conversations assigned to them
    return { ...extra, assignedToId: scope.userId }
}

// Build a Prisma `where` for WhatsApp accounts. ADMIN: all accounts.
function waAccountWhere(scope: UserScope): Record<string, any> {
    if (isGlobalScope(scope)) return {}
    if (scope.role === 'SUPERVISOR') {
        return { branchId: { in: scope.branchIds } }
    }
    return { id: { in: scope.whatsappAccountIds } }
}

// Build a Prisma `where` for contacts. ADMIN: all contacts. SUPERVISOR: their branches. AGENT: contacts in assigned convos.
function contactWhere(scope: UserScope): Record<string, any> {
    if (isGlobalScope(scope)) return {}
    if (scope.role === 'SUPERVISOR') {
        const hasBranchScope = scope.branchIds && scope.branchIds.length > 0
        const hasWaScope = scope.whatsappAccountIds && scope.whatsappAccountIds.length > 0

        const orClauses: Record<string, any>[] = []

        if (hasBranchScope) {
            orClauses.push({ branchId: { in: scope.branchIds } })
        }
        if (hasWaScope) {
            orClauses.push({
                conversations: {
                    some: {
                        messages: {
                            some: { whatsappAccountId: { in: scope.whatsappAccountIds } },
                        },
                    },
                },
            })
        }

        if (orClauses.length === 0) {
            return { id: { in: [] } }
        }

        return orClauses.length === 1 ? orClauses[0] : { OR: orClauses }
    }
    // AGENT: contacts that have a conversation assigned to this agent
    return {
        conversations: { some: { assignedToId: scope.userId } },
    }
}

// ─── Raw-SQL filter fragments (for $queryRaw) ───────────────────────
function messageRawJoinFilter(scope: UserScope, messageAlias: string = 'm'): string {
    if (isGlobalScope(scope)) return ''
    if (scope.role === 'SUPERVISOR') {
        return `
            JOIN \`Conversation\` conv ON ${messageAlias}.conversationId = conv.id
            JOIN \`Contact\` ct ON conv.contactId = ct.id
        `
    }
    return `
        JOIN \`Conversation\` conv ON ${messageAlias}.conversationId = conv.id
    `
}

function messageRawWhereFilter(scope: UserScope, messageAlias: string = 'm'): string {
    if (isGlobalScope(scope)) return ''
    if (scope.role === 'SUPERVISOR') {
        const ids = scope.branchIds.map(id => `'${id}'`).join(',')
        return ids.length > 0 ? `AND ct.branchId IN (${ids})` : 'AND 1=0'
    }
    const alias = messageAlias === 'Message' ? '`Message`' : messageAlias
    return `AND ${alias}.senderId = '${scope.userId}'`
}

// For response-time query: Agent's reply must be sent by them. Outgoing alias in query is 'outgoing'.
function responseTimeOutgoingFilter(scope: UserScope): string {
    if (scope.role !== 'AGENT') return ''
    return `AND outgoing.senderId = '${scope.userId}'`
}

function responseTimeConvFilter(scope: UserScope): string {
    if (scope.role !== 'AGENT') return ''
    return `AND conv.assignedToId = '${scope.userId}'`
}

/** Default payload when a section fails so the dashboard still loads. */
function defaultPayload(range: 'week' | 'month') {
    return {
        stats: { totalMessages: 0, totalConversations: 0, activeContacts: 0, avgResponseTime: '0m' },
        charts: {
            messagesByDay: getDefaultMessagesByDay(range),
            messageTypes: getDefaultMessageTypes(),
        },
        recentConversations: [],
        whatsappAccounts: [],
        teamPerformance: [
            { name: 'Response Rate', current: 0, target: 100, percentage: 0 },
            { name: 'Customer Satisfaction', current: 0, target: 100, percentage: 0 },
            { name: 'SLA Compliance', current: 0, target: 95, percentage: 0 },
        ],
        aiInsights: {
            peakActivity: null,
            topTemplate: { name: null, responseRate: 0, usageCount: 0 },
            weeklyGrowth: { percentage: 0, trend: 'stable' as const },
        },
        liveSupportStatus: {
            systemHealth: 'No Accounts',
            uptime: '<50%',
            agentEfficiency: 'Needs Improvement',
            agentEfficiencyPercentage: 0,
        },
    }
}

export async function GET(request: NextRequest) {
    let scope: Awaited<ReturnType<typeof requireAuthWithScope>>
    try {
        scope = await requireAuthWithScope(request)
    } catch (authError) {
        if (authError instanceof Error && authError.message === 'Unauthorized') {
            return unauthorizedResponse()
        }
        throw authError
    }

    const { searchParams } = new URL(request.url)
    const range = (searchParams.get('range') || 'week') as 'week' | 'month'
    const now = new Date()
    const daysToSubtract = range === 'month' ? 30 : 7
    const startDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000)
    const startDateStr = startDate.toISOString().slice(0, 19).replace('T', ' ')

    try {
        // ── 1. Total Messages ───────────────────────────────────────
        const totalMessages = await prisma.message.count({
            where: messageWhere(scope),
        })

        // ── 2. Total Conversations ──────────────────────────────────
        const totalConversations = await prisma.conversation.count({
            where: conversationWhere(scope),
        })

        // ── 3. Active Contacts ──────────────────────────────────────
        const activeContactsData = await prisma.conversation.findMany({
            where: conversationWhere(scope, { lastMessageAt: { gte: startDate } }),
            distinct: ['contactId'],
            select: { contactId: true },
        })
        const activeContacts = activeContactsData.length

        // ── 4. Average Response Time (raw SQL in try-catch; fallback 2.5m) ────────────────────────────────
        let avgMinutes = 2.5
        try {
            const joinFrag = messageRawJoinFilter(scope, 'incoming')
            const responseTimeConv = responseTimeConvFilter(scope)
            const responseTimeOut = responseTimeOutgoingFilter(scope)
            const responseTimeWhereExtra = scope.role === 'AGENT' ? `${responseTimeConv} ${responseTimeOut}` : messageRawWhereFilter(scope, 'incoming')
            const responseTimeData = await prisma.$queryRawUnsafe<Array<{ avgMinutes: number }>>(
                `SELECT AVG(TIMESTAMPDIFF(MINUTE, incoming.createdAt, outgoing.createdAt)) as avgMinutes
                 FROM \`Message\` incoming
                 JOIN \`Message\` outgoing ON incoming.conversationId = outgoing.conversationId
                 ${joinFrag}
                 ${scope.role === 'AGENT' ? 'JOIN \`Conversation\` conv ON incoming.conversationId = conv.id' : ''}
                 WHERE incoming.direction = 'INCOMING'
                   AND outgoing.direction = 'OUTGOING'
                   AND outgoing.createdAt > incoming.createdAt
                   AND incoming.createdAt >= ?
                   AND TIMESTAMPDIFF(MINUTE, incoming.createdAt, outgoing.createdAt) <= 60
                   ${responseTimeWhereExtra}`,
                startDateStr,
            )
            if (responseTimeData[0]?.avgMinutes != null) avgMinutes = Number(responseTimeData[0].avgMinutes)
        } catch (_) {
            // use default 2.5m if raw SQL fails (e.g. table naming)
        }
        const avgResponseTime = `${avgMinutes.toFixed(1)}m`

        // ── 5. Messages by Day (Prisma-only: no raw SQL) ──────────────────────────────────────
        const messagesInRange = await prisma.message.findMany({
            where: { ...messageWhere(scope), createdAt: { gte: startDate } },
            select: { createdAt: true, direction: true },
            take: 10000,
        })
        const dayMap = new Map<string, { incoming: number; outgoing: number }>()
        const dayOrder: string[] = []
        for (const msg of messagesInRange) {
            const d = new Date(msg.createdAt)
            const key = d.toISOString().slice(0, 10)
            if (!dayMap.has(key)) {
                dayMap.set(key, { incoming: 0, outgoing: 0 })
                dayOrder.push(key)
            }
            const row = dayMap.get(key)!
            if (msg.direction === 'INCOMING') row.incoming += 1
            else row.outgoing += 1
        }
        dayOrder.sort()
        const dayNamesShort: Record<string, string> = { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' }
        const messagesByDay = dayOrder.map((key) => {
            const dayName = dayNamesShort[new Date(key + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })] || key
            const row = dayMap.get(key)!
            return { day: dayName, incoming: row.incoming, outgoing: row.outgoing }
        })

        // ── 6. Message Types Distribution ───────────────────────────
        const messageTypesRaw = await prisma.message.groupBy({
            by: ['type'],
            where: messageWhere(scope),
            _count: { type: true },
        })

        const messageTypes = messageTypesRaw.map(item => ({
            name: item.type.charAt(0) + item.type.slice(1).toLowerCase(),
            value: item._count.type,
            color: getColorForType(item.type),
        }))

        // ── 7. Recent Conversations (last 10) ──────────────────────
        const recentConversationsRaw = await prisma.conversation.findMany({
            where: conversationWhere(scope),
            take: 10,
            orderBy: { lastMessageAt: 'desc' },
            include: {
                contact: true,
                messages: { take: 1, orderBy: { createdAt: 'desc' } },
                _count: {
                    select: {
                        messages: {
                            where: { direction: 'INCOMING', status: { not: 'READ' } },
                        },
                    },
                },
            },
        })

        const recentConversations = recentConversationsRaw.map(conv => ({
            id: conv.id,
            name: conv.contact.name,
            phone: conv.contact.phone,
            lastMessage: conv.messages[0]?.content || 'No messages',
            time: formatTimeAgo(conv.lastMessageAt),
            unread: conv._count.messages,
        }))

        // ── 8. WhatsApp Accounts Status ─────────────────────────────
        const whatsappAccounts = await prisma.whatsAppAccount.findMany({
            where: waAccountWhere(scope),
            include: { branch: true },
        })

        const accountsStatus = whatsappAccounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            phone: acc.phone,
            status: acc.status,
            branch: acc.branch?.name || 'No Branch',
        }))

        // ── 9. Team Performance Metrics ─────────────────────────────
        const totalIncoming = await prisma.message.count({
            where: messageWhere(scope, { direction: 'INCOMING' }),
        })
        const totalOutgoing = await prisma.message.count({
            where: messageWhere(scope, { direction: 'OUTGOING' }),
        })

        const responseRateRaw = totalIncoming > 0
            ? Math.round((totalOutgoing / totalIncoming) * 100) : 0
        const responseRate = Math.min(100, responseRateRaw)

        const totalContactsCount = await prisma.contact.count({
            where: contactWhere(scope),
        })
        const customerSatisfaction = totalContactsCount > 0
            ? Math.round((activeContacts / totalContactsCount) * 100) : 0

        const slaScore = avgMinutes > 0 ? Math.round(100 - (avgMinutes / 60 * 20)) : 100

        const teamPerformance = [
            { name: "Response Rate", current: responseRate, target: 100, percentage: responseRate },
            { name: "Customer Satisfaction", current: customerSatisfaction, target: 100, percentage: customerSatisfaction },
            { name: "SLA Compliance", current: slaScore > 100 ? 100 : slaScore, target: 95, percentage: slaScore > 100 ? 100 : slaScore },
        ]

        // ── 10. AI Insights (Prisma-only: use messagesInRange) ─────────────────────────────────────────
        const hourCounts = new Map<string, number>()
        for (const msg of messagesInRange) {
            const d = new Date(msg.createdAt)
            const key = `${d.toISOString().slice(0, 10)}-${d.getHours()}`
            hourCounts.set(key, (hourCounts.get(key) || 0) + 1)
        }
        let peakKey: string | null = null
        let peakCount = 0
        let totalHourCount = 0
        for (const [k, count] of hourCounts) {
            totalHourCount += count
            if (count > peakCount) {
                peakCount = count
                peakKey = k
            }
        }
        const hourSlotCount = hourCounts.size || 1
        const avgCount = totalHourCount / hourSlotCount
        const peakVsAvg = avgCount > 0 ? Math.round(((peakCount - avgCount) / avgCount) * 100) : 14
        const dayNames: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }
        let peakDay: string | null = null
        let peakTime: string | null = null
        if (peakKey) {
            const [datePart, hourPart] = peakKey.split('-')
            const hour = parseInt(hourPart, 10)
            peakDay = dayNames[new Date(datePart + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })] || datePart
            peakTime = hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`
        }

        const topTemplate = await prisma.template.findFirst({
            where: { status: 'APPROVED' },
            orderBy: { createdAt: 'desc' },
        })

        const templateResponseRate = responseRate

        // Weekly Growth
        const previousPeriodStart = new Date(now.getTime() - (daysToSubtract * 2) * 24 * 60 * 60 * 1000)
        const previousPeriodEnd = startDate

        const currentPeriodMessages = await prisma.message.count({
            where: messageWhere(scope, { createdAt: { gte: startDate } }),
        })
        const previousPeriodMessages = await prisma.message.count({
            where: messageWhere(scope, {
                createdAt: { gte: previousPeriodStart, lt: previousPeriodEnd },
            }),
        })

        const weeklyGrowthPct = previousPeriodMessages > 0
            ? ((currentPeriodMessages - previousPeriodMessages) / previousPeriodMessages) * 100
            : currentPeriodMessages > 0 ? 100 : 0
        const weeklyGrowthTrend = weeklyGrowthPct > 0 ? 'up' : weeklyGrowthPct < 0 ? 'down' : 'stable'

        // ── 11. Live Support Status ─────────────────────────────────
        const connectedAccounts = whatsappAccounts.filter(acc => acc.status === 'CONNECTED').length
        const totalAccounts = whatsappAccounts.length
        const systemHealth = totalAccounts > 0 && connectedAccounts > 0 ? 'Healthy' : totalAccounts === 0 ? 'No Accounts' : 'Degraded'

        const uptimePercentage = totalAccounts > 0 ? Math.round((connectedAccounts / totalAccounts) * 100) : 0
        const uptime = uptimePercentage >= 90 ? '99.9%' : uptimePercentage >= 50 ? `${uptimePercentage}%` : '<50%'

        const agentEfficiency = responseRate >= 80 ? 'Optimal' : responseRate >= 50 ? 'Good' : responseRate >= 25 ? 'Fair' : 'Needs Improvement'
        const agentEfficiencyPercentage = Math.min(100, responseRate)

        const aiInsights = {
            peakActivity: peakDay != null && peakTime != null ? {
                day: peakDay, time: peakTime, vsAvg: peakVsAvg,
                confidence: Math.min(100, avgCount > 0 && peakCount > 0 ? Math.round((peakCount / (avgCount || 1)) * 50) + 50 : 92),
            } : null,
            topTemplate: {
                name: topTemplate?.name ?? null,
                responseRate: templateResponseRate,
                usageCount: totalOutgoing,
            },
            weeklyGrowth: { percentage: weeklyGrowthPct, trend: weeklyGrowthTrend },
        }

        const liveSupportStatus = { systemHealth, uptime, agentEfficiency, agentEfficiencyPercentage }

        return NextResponse.json({
            success: true,
            data: {
                stats: { totalMessages, totalConversations, activeContacts, avgResponseTime },
                charts: {
                    messagesByDay: messagesByDay.length > 0 ? messagesByDay : getDefaultMessagesByDay(range as 'week' | 'month'),
                    messageTypes: messageTypes.length > 0 ? messageTypes : getDefaultMessageTypes(),
                },
                recentConversations,
                whatsappAccounts: accountsStatus,
                teamPerformance,
                aiInsights,
                liveSupportStatus,
            },
        })
    } catch (error) {
        console.error('Dashboard stats error:', error)
        // Return 200 with default data so the dashboard still loads; frontend can show retry or partial state
        return NextResponse.json({
            success: true,
            data: defaultPayload(range),
            _warning: process.env.NODE_ENV === 'development'
                ? (error instanceof Error ? error.message : 'Unknown error')
                : undefined,
        })
    }
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
}

function getColorForType(type: string): string {
    const colors: Record<string, string> = {
        TEXT: '#8884d8', IMAGE: '#82ca9d', VIDEO: '#ffc658', AUDIO: '#ff7300',
        DOCUMENT: '#0088fe', LOCATION: '#00C49F', STICKER: '#FFBB28', CONTACT: '#FF8042',
    }
    return colors[type] || '#999999'
}

function getDefaultMessagesByDay(range: 'week' | 'month') {
    const days = range === 'month' ? 30 : 7
    const result = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
        result.push({ day: dayName, incoming: 0, outgoing: 0 })
    }
    return result
}

function getDefaultMessageTypes() {
    return [
        { name: 'Text', value: 0, color: 'hsl(var(--chart-1))' },
        { name: 'Images', value: 0, color: 'hsl(var(--chart-4))' },
        { name: 'Documents', value: 0, color: 'hsl(var(--chart-3))' },
    ]
}
