import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
    requireAuthWithScope,
    unauthorizedResponse,
    UserScope,
} from "@/lib/api-auth"

// ─── Scope helpers (role-based analytics: Admin global, Supervisor branches, Agent own only) ───

function contactWhere(scope: UserScope) {
    if (scope.role === "ADMIN") return {}
    if (scope.role === "SUPERVISOR") {
        if (!scope.branchIds?.length) return { id: { in: [] } }
        return { branchId: { in: scope.branchIds } }
    }
    return { conversations: { some: { assignedToId: scope.userId } } }
}

function conversationWhere(scope: UserScope) {
    if (scope.role === "ADMIN") return {}
    if (scope.role === "SUPERVISOR") {
        if (!scope.branchIds?.length) return { id: { in: [] } }
        return { contact: { branchId: { in: scope.branchIds } } }
    }
    return { assignedToId: scope.userId }
}

function messageWhere(scope: UserScope, extra: Record<string, unknown> = {}) {
    if (scope.role === "ADMIN") return { ...extra }
    if (scope.role === "SUPERVISOR") {
        return {
            ...extra,
            conversation: { contact: { branchId: { in: scope.branchIds } } },
        }
    }
    return { ...extra, senderId: scope.userId }
}

function bookingWhere(scope: UserScope) {
    if (scope.role === "ADMIN") return {}
    if (scope.role === "SUPERVISOR") {
        if (!scope.branchIds?.length) return { id: { in: [] } }
        return { contact: { branchId: { in: scope.branchIds } } }
    }
    return { agentId: scope.userId }
}

function invoiceWhere(scope: UserScope) {
    if (scope.role === "ADMIN") return {}
    return { contact: contactWhere(scope) }
}

function userWhereForTeam(scope: UserScope) {
    if (scope.role === "ADMIN") return { role: { in: ["AGENT", "SUPERVISOR"] } }
    if (scope.role === "SUPERVISOR") {
        if (!scope.branchIds?.length) return { id: { in: [] } }
        return { branches: { some: { id: { in: scope.branchIds } } }, role: { in: ["AGENT", "SUPERVISOR"] } }
    }
    return { id: scope.userId }
}

async function logWhere(scope: UserScope): Promise<Record<string, unknown>> {
    if (scope.role === "ADMIN") return {}
    if (scope.role === "SUPERVISOR") {
        if (!scope.branchIds?.length) return { userId: { in: [] } }
        const users = await prisma.user.findMany({
            where: { branches: { some: { id: { in: scope.branchIds } } } },
            select: { id: true },
        })
        return { userId: { in: users.map((u) => u.id) } }
    }
    return { userId: scope.userId }
}

export async function GET(request: NextRequest) {
    try {
        const scope = await requireAuthWithScope(request)

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const cWhere = contactWhere(scope)
        const convWhere = conversationWhere(scope)
        const msgWhere = messageWhere(scope)
        const bookWhere = bookingWhere(scope)
        const invWhere = invoiceWhere(scope)
        const userWhere = userWhereForTeam(scope)
        const logWhereClause = await logWhere(scope)

        const [
            totalContacts,
            totalConversations,
            totalMessages,
            totalBookings,
            totalInvoices,
            conversationStats,
            messageStats,
            bookingStats,
            invoiceStats,
            dailyStats,
            agentUsers,
            quickResponsesCount,
            recentLogs,
        ] = await Promise.all([
            prisma.contact.count({ where: cWhere }),
            prisma.conversation.count({ where: convWhere }),
            prisma.message.count({ where: msgWhere }),
            prisma.booking.count({ where: bookWhere }),
            prisma.invoice.count({ where: invWhere }),
            prisma.conversation.groupBy({
                by: ["status"],
                where: convWhere,
                _count: { status: true },
            }),
            prisma.message.groupBy({
                by: ["type"],
                where: msgWhere,
                _count: { type: true },
            }),
            prisma.booking.groupBy({
                by: ["status"],
                where: bookWhere,
                _count: { status: true },
            }),
            prisma.invoice.groupBy({
                by: ["status"],
                where: invWhere,
                _count: { status: true },
            }),
            prisma.message.groupBy({
                by: ["createdAt"],
                where: { ...msgWhere, createdAt: { gte: sevenDaysAgo } },
                _count: { id: true },
            }),
            prisma.user.findMany({
                where: userWhere,
                select: {
                    id: true,
                    name: true,
                    _count: {
                        select: {
                            conversations: true,
                            messages: true,
                        },
                    },
                },
            }),
            prisma.conversation.count({
                where: { ...convWhere, status: "RESOLVED" },
            }),
            prisma.log.findMany({
                where: logWhereClause,
                take: 10,
                orderBy: { createdAt: "desc" },
                include: {
                    user: { select: { name: true } },
                },
            }),
        ])

        const totalUsers = scope.role === "ADMIN"
            ? await prisma.user.count()
            : agentUsers.length
        const totalTemplates = scope.role === "ADMIN"
            ? await prisma.template.count()
            : 0

        const satisfactionRate =
            totalConversations > 0
                ? Math.round((quickResponsesCount / totalConversations) * 100)
                : 0
        const responseRate =
            totalConversations > 0
                ? Math.round((quickResponsesCount / totalConversations) * 100)
                : 0

        const analytics = {
            overview: {
                totalUsers,
                totalContacts,
                totalConversations,
                totalMessages,
                totalTemplates,
                totalBookings,
                totalInvoices,
                activeConversations:
                    conversationStats.find((s) => s.status === "ACTIVE")?._count.status || 0,
                resolvedConversations:
                    conversationStats.find((s) => s.status === "RESOLVED")?._count.status || 0,
                pendingConversations:
                    conversationStats.find((s) => s.status === "PENDING")?._count.status || 0,
            },
            performance: {
                responseRate,
                customerSatisfaction: satisfactionRate,
                averageResponseTime: "2.5m",
                activeUsers: agentUsers.length,
            },
            charts: {
                conversationStatuses: conversationStats.map((stat) => ({
                    name: stat.status,
                    value: stat._count.status,
                })),
                messageTypes: messageStats.map((stat) => ({
                    name: stat.type,
                    value: stat._count.type,
                })),
                bookingStatuses: bookingStats.map((stat) => ({
                    name: stat.status,
                    value: stat._count.status,
                })),
                invoiceStatuses: invoiceStats.map((stat) => ({
                    name: stat.status,
                    value: stat._count.status,
                })),
                dailyActivity: Array.from({ length: 7 }, (_, i) => {
                    const date = new Date()
                    date.setDate(date.getDate() - (6 - i))
                    const dayMessages = dailyStats
                        .filter((stat) => {
                            const statDate = new Date(stat.createdAt)
                            return statDate.toDateString() === date.toDateString()
                        })
                        .reduce((sum, stat) => sum + stat._count.id, 0)
                    return {
                        day: date.toLocaleDateString("en-US", { weekday: "short" }),
                        messages: dayMessages,
                        conversations: Math.floor(dayMessages / 2),
                        users: scope.role === "ADMIN" ? Math.floor(dayMessages / 3) : (scope.role === "AGENT" ? (dayMessages > 0 ? 1 : 0) : agentUsers.length),
                    }
                }),
            },
            teamPerformance: agentUsers.map((agent) => ({
                name: agent.name,
                conversations: agent._count.conversations,
                messages: agent._count.messages,
                efficiency:
                    agent._count.messages > 0
                        ? Math.round((agent._count.conversations / agent._count.messages) * 100)
                        : 0,
            })),
            recentActivity: recentLogs,
        }

        return NextResponse.json({
            success: true,
            data: analytics,
        })
    } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
            return unauthorizedResponse()
        }
        console.error("Error fetching analytics:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch analytics data",
            },
            { status: 500 }
        )
    }
}
