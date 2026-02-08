import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const range = searchParams.get('range') || 'week' // week | month

        // Get date ranges
        const now = new Date()
        const daysToSubtract = range === 'month' ? 30 : 7
        const startDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000)

        // 1. Total Messages Count
        const totalMessages = await prisma.message.count()

        // 2. Total Conversations Count
        const totalConversations = await prisma.conversation.count()

        // 3. Active Contacts (contacts with activity in last 7 days)
        const activeContactsData = await prisma.conversation.findMany({
            where: {
                lastMessageAt: {
                    gte: startDate
                }
            },
            distinct: ['contactId'],
            select: {
                contactId: true
            }
        })
        const activeContacts = activeContactsData.length

        // 4. Calculate Average Response Time
        const responseTimeData = await prisma.$queryRaw<Array<{ avgMinutes: number }>>`
      SELECT AVG(TIMESTAMPDIFF(MINUTE, incoming.createdAt, outgoing.createdAt)) as avgMinutes
      FROM Message incoming
      JOIN Message outgoing ON incoming.conversationId = outgoing.conversationId
      WHERE incoming.direction = 'INCOMING'
        AND outgoing.direction = 'OUTGOING'
        AND outgoing.createdAt > incoming.createdAt
        AND incoming.createdAt >= ${startDate}
        AND TIMESTAMPDIFF(MINUTE, incoming.createdAt, outgoing.createdAt) <= 60
    `

        const avgMinutes = responseTimeData[0]?.avgMinutes || 2.5
        const avgResponseTime = `${avgMinutes.toFixed(1)}m`

        // 5. Messages by Day
        const messagesByDay = await prisma.$queryRaw<Array<{
            day: string
            incoming: number
            outgoing: number
        }>>`
      SELECT 
        DATE_FORMAT(createdAt, '%a') as day,
        SUM(CASE WHEN direction = 'INCOMING' THEN 1 ELSE 0 END) as incoming,
        SUM(CASE WHEN direction = 'OUTGOING' THEN 1 ELSE 0 END) as outgoing
      FROM Message
      WHERE createdAt >= ${startDate}
      GROUP BY DATE(createdAt), day
      ORDER BY DATE(createdAt)
    `

        // 6. Message Types Distribution
        const messageTypesRaw = await prisma.message.groupBy({
            by: ['type'],
            _count: {
                type: true
            }
        })

        const messageTypes = messageTypesRaw.map(item => ({
            name: item.type.charAt(0) + item.type.slice(1).toLowerCase(),
            value: item._count.type,
            color: getColorForType(item.type)
        }))

        // 7. Recent Conversations (last 10)
        const recentConversationsRaw = await prisma.conversation.findMany({
            take: 10,
            orderBy: {
                lastMessageAt: 'desc'
            },
            include: {
                contact: true,
                messages: {
                    take: 1,
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                _count: {
                    select: {
                        messages: {
                            where: {
                                direction: 'INCOMING',
                                status: {
                                    not: 'READ'
                                }
                            }
                        }
                    }
                }
            }
        })

        const recentConversations = recentConversationsRaw.map(conv => ({
            id: conv.id,
            name: conv.contact.name,
            phone: conv.contact.phone,
            lastMessage: conv.messages[0]?.content || 'No messages',
            time: formatTimeAgo(conv.lastMessageAt),
            unread: conv._count.messages
        }))

        // 8. WhatsApp Accounts Status
        const whatsappAccounts = await prisma.whatsAppAccount.findMany({
            include: {
                branch: true
            }
        })

        const accountsStatus = whatsappAccounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            phone: acc.phone,
            status: acc.status,
            branch: acc.branch?.name || 'No Branch'
        }))

        // 9. Calculate Team Performance Metrics
        const totalIncoming = await prisma.message.count({
            where: { direction: 'INCOMING' }
        })
        const totalOutgoing = await prisma.message.count({
            where: { direction: 'OUTGOING' }
        })

        // Response Rate: percentage of incoming messages that got a response (cap at 100%)
        const responseRateRaw = totalIncoming > 0
            ? Math.round((totalOutgoing / totalIncoming) * 100)
            : 0
        const responseRate = Math.min(100, responseRateRaw)

        // Customer Satisfaction: based on active conversations ratio
        const totalContactsCount = await prisma.contact.count()
        const customerSatisfaction = totalContactsCount > 0
            ? Math.round((activeContacts / totalContactsCount) * 100)
            : 0

        const slaScore = avgMinutes > 0 ? Math.round(100 - (avgMinutes / 60 * 20)) : 100 // Simple heuristic

        const teamPerformance = [
            {
                name: "Response Rate",
                current: responseRate,
                target: 100,
                percentage: responseRate
            },
            {
                name: "Customer Satisfaction",
                current: customerSatisfaction,
                target: 100,
                percentage: customerSatisfaction
            },
            {
                name: "SLA Compliance",
                current: slaScore > 100 ? 100 : slaScore,
                target: 95,
                percentage: slaScore > 100 ? 100 : slaScore
            }
        ]

        // 10. Calculate AI Analytics Insights
        // Peak Activity - Find day and hour with most messages
        const peakActivityData = await prisma.$queryRaw<Array<{
            day: string
            hour: number
            count: bigint
        }>>`
            SELECT 
                DATE_FORMAT(createdAt, '%a') as day,
                HOUR(createdAt) as hour,
                COUNT(*) as count
            FROM Message
            WHERE createdAt >= ${startDate}
            GROUP BY DATE(createdAt), HOUR(createdAt), day
            ORDER BY count DESC
            LIMIT 1
        `

        const peakActivity = peakActivityData[0] || null
        const dayNames: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }
        const peakDay = peakActivity ? (dayNames[peakActivity.day] || peakActivity.day) : null
        const peakHour = peakActivity ? peakActivity.hour : null
        const peakTime = peakHour != null ? (peakHour < 12 ? `${peakHour}:00 AM` : peakHour === 12 ? '12:00 PM' : `${peakHour - 12}:00 PM`) : null

        // Calculate average messages per hour for comparison
        const avgMessagesPerHour = await prisma.$queryRaw<Array<{ avgCount: number }>>`
            SELECT AVG(hourly_count) as avgCount
            FROM (
                SELECT COUNT(*) as hourly_count
                FROM Message
                WHERE createdAt >= ${startDate}
                GROUP BY DATE(createdAt), HOUR(createdAt)
            ) as hourly_stats
        `
        const avgCount = avgMessagesPerHour[0]?.avgCount || 0
        const peakCount = peakActivity ? Number(peakActivity.count) : 0
        const peakVsAvg = avgCount > 0 ? Math.round(((peakCount - avgCount) / avgCount) * 100) : 14

        // Top Template - Get most recent approved template
        const topTemplate = await prisma.template.findFirst({
            where: { status: 'APPROVED' },
            orderBy: { createdAt: 'desc' }
        })

        // Template "response rate" = overall response rate capped at 100%
        const templateResponseRate = responseRate

        // Weekly Growth - Compare current period with previous period (same length)
        const previousPeriodStart = new Date(now.getTime() - (daysToSubtract * 2) * 24 * 60 * 60 * 1000)
        const previousPeriodEnd = startDate

        const currentPeriodMessages = await prisma.message.count({
            where: { createdAt: { gte: startDate } }
        })

        const previousPeriodMessages = await prisma.message.count({
            where: {
                createdAt: {
                    gte: previousPeriodStart,
                    lt: previousPeriodEnd
                }
            }
        })

        // نمو فعلي: إن لم يكن هناك رسائل سابقة = لا نسبة (0 أو stable)
        const weeklyGrowthPct = previousPeriodMessages > 0
            ? ((currentPeriodMessages - previousPeriodMessages) / previousPeriodMessages) * 100
            : currentPeriodMessages > 0 ? 100 : 0
        const weeklyGrowthTrend = weeklyGrowthPct > 0 ? 'up' : weeklyGrowthPct < 0 ? 'down' : 'stable'

        // 11. Calculate Live Support Status
        const connectedAccounts = whatsappAccounts.filter(acc => acc.status === 'CONNECTED').length
        const totalAccounts = whatsappAccounts.length
        const systemHealth = totalAccounts > 0 && connectedAccounts > 0 ? 'Healthy' : totalAccounts === 0 ? 'No Accounts' : 'Degraded'

        // Calculate uptime (simplified - based on connected accounts)
        const uptimePercentage = totalAccounts > 0 ? Math.round((connectedAccounts / totalAccounts) * 100) : 0
        const uptime = uptimePercentage >= 90 ? '99.9%' : uptimePercentage >= 50 ? `${uptimePercentage}%` : '<50%'

        // Agent Efficiency - based on response rate (capped at 100)
        const agentEfficiency = responseRate >= 80 ? 'Optimal' : responseRate >= 50 ? 'Good' : responseRate >= 25 ? 'Fair' : 'Needs Improvement'
        const agentEfficiencyPercentage = Math.min(100, responseRate)

        const aiInsights = {
            peakActivity: peakDay != null && peakTime != null ? {
                day: peakDay,
                time: peakTime,
                vsAvg: peakVsAvg,
                confidence: Math.min(100, avgCount > 0 && peakCount > 0 ? Math.round((peakCount / (avgCount || 1)) * 50) + 50 : 92)
            } : null,
            topTemplate: {
                name: topTemplate?.name ?? null,
                responseRate: templateResponseRate,
                usageCount: totalOutgoing // عدد الرسائل الصادرة الفعلي (لا تقدير)
            },
            weeklyGrowth: {
                percentage: weeklyGrowthPct,
                trend: weeklyGrowthTrend
            }
        }

        const liveSupportStatus = {
            systemHealth,
            uptime,
            agentEfficiency,
            agentEfficiencyPercentage
        }

        return NextResponse.json({
            success: true,
            data: {
                stats: {
                    totalMessages,
                    totalConversations,
                    activeContacts,
                    avgResponseTime
                },
                charts: {
                    messagesByDay: messagesByDay.length > 0 ? messagesByDay : getDefaultMessagesByDay(range as 'week' | 'month'),
                    messageTypes: messageTypes.length > 0 ? messageTypes : getDefaultMessageTypes()
                },
                recentConversations,
                whatsappAccounts: accountsStatus,
                teamPerformance,
                aiInsights,
                liveSupportStatus
            }
        })

    } catch (error) {
        console.error('Dashboard stats error:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch dashboard statistics',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}

// Helper function to format time ago
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

// Helper function to get color for message type
// Helper function to get color for message type
function getColorForType(type: string): string {
    const colors: Record<string, string> = {
        TEXT: '#8884d8',      // Purple
        IMAGE: '#82ca9d',     // Green
        VIDEO: '#ffc658',     // Yellow
        AUDIO: '#ff7300',     // Orange
        DOCUMENT: '#0088fe',  // Blue
        LOCATION: '#00C49F',  // Teal
        STICKER: '#FFBB28',   // Gold
        CONTACT: '#FF8042'    // Coral
    }
    return colors[type] || '#999999' // Grey default
}

// Default data when no messages exist
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
        { name: 'Documents', value: 0, color: 'hsl(var(--chart-3))' }
    ]
}
