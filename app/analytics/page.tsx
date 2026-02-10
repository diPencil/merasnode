"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, MessageSquare, Users, Clock, TrendingUp } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { authenticatedFetch } from "@/lib/auth"

export default function AnalyticsPage() {
    const { t } = useI18n()
    const [stats, setStats] = useState({
        totalConversations: 0,
        totalContacts: 0,
        avgResponseTime: "0m",
        totalMessages: 0,
    })
    const [analyticsData, setAnalyticsData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true)
            const response = await authenticatedFetch("/api/analytics/overview")
            const data = await response.json()

            if (data.success) {
                setStats({
                    totalConversations: data.data.overview.totalConversations,
                    totalContacts: data.data.overview.totalContacts,
                    avgResponseTime: data.data.performance.averageResponseTime,
                    totalMessages: data.data.overview.totalMessages,
                })
                setAnalyticsData(data.data)
            }
        } catch (error) {
            console.error("Error fetching analytics:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const analyticsCards = [
        {
            title: t("totalConversationsLabel"),
            value: stats.totalConversations.toString(),
            icon: MessageSquare,
            color: "text-primary",
            bgColor: "bg-primary/10",
        },
        {
            title: t("totalContactsLabel"),
            value: stats.totalContacts.toString(),
            icon: Users,
            color: "text-secondary",
            bgColor: "bg-secondary/10",
        },
        {
            title: t("avgResponseTimeLabel"),
            value: stats.avgResponseTime,
            icon: Clock,
            color: "text-warning",
            bgColor: "bg-warning/10",
        },
        {
            title: t("totalMessagesLabel"),
            value: stats.totalMessages.toString(),
            icon: TrendingUp,
            color: "text-success",
            bgColor: "bg-success/10",
        },
    ]

    return (
        <AppLayout title={t("analytics")}>
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t("analytics")}</h2>
                    <p className="text-muted-foreground">{t("analyticsPageDescription")}</p>
                </div>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <p className="mt-4 text-sm text-muted-foreground">{t("loading")}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {analyticsCards.map((card) => {
                                const Icon = card.icon
                                return (
                                    <Card key={card.title} className="rounded-2xl shadow-soft">
                                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                                {card.title}
                                            </CardTitle>
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bgColor}`}>
                                                <Icon className={`h-5 w-5 ${card.color}`} />
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">{card.value}</div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                <span className="text-success">+12%</span>{" "}
                                                {t("fromLastMonth")}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>

                        {/* Additional Stats */}
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            <Card className="rounded-2xl shadow-soft">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {t("activeConversationsLabel")}
                                    </CardTitle>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                                        <MessageSquare className="h-5 w-5 text-blue-500" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{analyticsData?.overview.activeConversations || 0}</div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t("currentlyActive")}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl shadow-soft">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {t("responseRate")}
                                    </CardTitle>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                                        <TrendingUp className="h-5 w-5 text-green-500" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{analyticsData?.performance.responseRate || 0}%</div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t("quickResponses")}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl shadow-soft">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {t("customerSatisfaction")}
                                    </CardTitle>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                                        <Users className="h-5 w-5 text-purple-500" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{analyticsData?.performance.customerSatisfaction || 0}%</div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t("basedOnResponses")}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl shadow-soft">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {t("activeUsersLabel")}
                                    </CardTitle>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                                        <Users className="h-5 w-5 text-orange-500" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{analyticsData?.performance.activeUsers || 0}</div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t("teamMembers")}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts and Performance */}
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card className="rounded-2xl shadow-soft">
                                <CardHeader>
                                    <CardTitle>{t("dailyActivityTitle")}</CardTitle>
                                    <CardDescription>{t("dailyActivityDesc")}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {analyticsData?.charts.dailyActivity?.map((day: any, index: number) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{day.day}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm text-muted-foreground">
                                                        {day.messages} {t("messagesLabel")}
                                                    </span>
                                                    <div className="w-24 bg-muted rounded-full h-2">
                                                        <div
                                                            className="bg-primary h-2 rounded-full"
                                                            style={{ width: `${Math.min((day.messages / 10) * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl shadow-soft">
                                <CardHeader>
                                    <CardTitle>{t("conversationStatusTitle")}</CardTitle>
                                    <CardDescription>{t("conversationStatusDesc")}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {analyticsData?.charts.conversationStatuses?.map((status: any, index: number) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{status.name}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm text-muted-foreground">{status.value}</span>
                                                    <div className="w-24 bg-muted rounded-full h-2">
                                                        <div
                                                            className="bg-blue-500 h-2 rounded-full"
                                                            style={{ width: `${(status.value / Math.max(...analyticsData.charts.conversationStatuses.map((s: any) => s.value))) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Team Performance */}
                        <Card className="rounded-2xl shadow-soft">
                                <CardHeader>
                                <CardTitle>{t("teamPerformance")}</CardTitle>
                                <CardDescription>{t("teamPerformanceDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {analyticsData?.teamPerformance?.map((agent: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <p className="font-medium">{agent.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {agent.conversations} {t("conversationsLabel")}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium">
                                                    {agent.messages} {t("messagesLabel")}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {agent.efficiency}% {t("efficiencyLabel")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!analyticsData?.teamPerformance || analyticsData.teamPerformance.length === 0) && (
                                        <div className="text-center text-muted-foreground py-8">
                                            {t("noTeamPerformanceData")}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    )
}
