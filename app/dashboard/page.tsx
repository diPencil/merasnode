"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, MessageSquare, Users, Clock, Plus, ArrowUpRight, Smartphone, Sparkles, Zap, BarChart3, Activity, ShieldCheck, Heart } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getUserRole, authenticatedFetch } from "@/lib/auth"

interface DashboardStats {
  totalMessages: number
  totalConversations: number
  activeContacts: number
  avgResponseTime: string
}

interface MessageByDay {
  day: string
  incoming: number
  outgoing: number
}

interface MessageType {
  name: string
  value: number
  color: string
}

interface RecentConversation {
  id: string
  name: string
  phone: string
  lastMessage: string
  time: string
  unread: number
}

interface WhatsAppAccount {
  id: string
  name: string
  phone: string
  status: string
  branch: string
}

function MomentumChart({ data, trend }: { data: MessageByDay[]; trend?: string }) {
  const n = data.length
  if (n === 0) {
    return (
      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
        <path d="M0,35 L100,35" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
      </svg>
    )
  }
  const totals = data.map(d => d.incoming + d.outgoing)
  const max = Math.max(1, ...totals)
  const w = 100 / (n - 1 || 1)
  const points = totals.map((v, i) => {
    const x = i * w
    const y = 40 - (v / max) * 36
    return `${x},${Math.max(2, Math.min(38, y))}`
  })
  const pathD = `M ${points.join(" L ")}`
  const strokeClass = trend === "down" ? "text-red-500 dark:text-red-400" : trend === "stable" ? "text-slate-500 dark:text-slate-400" : "text-green-500 dark:text-green-400"
  return (
    <div className="w-full h-full rtl:scale-x-[-1]">
      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
        <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={strokeClass} />
      </svg>
    </div>
  )
}

const TEAM_METRIC_KEYS: Record<string, string> = {
  "Response Rate": "responseRate",
  "Customer Satisfaction": "customerSatisfaction",
  "SLA Compliance": "slaCompliance",
}
const SYSTEM_HEALTH_KEYS: Record<string, string> = {
  Healthy: "healthy",
  Degraded: "degraded",
  "No Accounts": "noAccounts",
}
const AGENT_EFFICIENCY_KEYS: Record<string, string> = {
  Optimal: "optimal",
  Good: "good",
  Fair: "fair",
  "Needs Improvement": "needsImprovement",
}

export default function DashboardPage() {
  const { t, dir } = useI18n()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [greetingKey, setGreetingKey] = useState<"goodMorning" | "goodAfternoon" | "goodEvening">("goodMorning")
  const [stats, setStats] = useState<DashboardStats>({
    totalConversations: 0,
    totalMessages: 0,
    activeContacts: 0,
    avgResponseTime: "0m"
  })
  const [messagesByDay, setMessagesByDay] = useState<MessageByDay[]>([])
  const [messageTypes, setMessageTypes] = useState<MessageType[]>([])
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsAppAccount[]>([])
  const [teamPerformance, setTeamPerformance] = useState<Array<{ name: string, current: number, target: number, percentage: number }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week')
  const [aiInsights, setAiInsights] = useState<{
    peakActivity: { day: string; time: string; vsAvg: number; confidence: number }
    topTemplate: { name: string; responseRate: number; usageCount: number }
    weeklyGrowth: { percentage: number; trend: string }
  } | null>(null)
  const [liveSupportStatus, setLiveSupportStatus] = useState<{
    systemHealth: string
    uptime: string
    agentEfficiency: string
    agentEfficiencyPercentage: number
  } | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe']
  const userRole = getUserRole()
  const isSuperAdmin = userRole === 'ADMIN'

  useEffect(() => {
    setMounted(true)
    const hour = new Date().getHours()
    if (hour < 12) setGreetingKey("goodMorning")
    else if (hour < 18) setGreetingKey("goodAfternoon")
    else setGreetingKey("goodEvening")

    fetchDashboardData()
  }, [timeRange])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setFetchError(null)
      const response = await authenticatedFetch(`/api/dashboard/stats?range=${timeRange}`)
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        setFetchError(result?.error || t("errorLoadingDashboard"))
        return
      }

      if (result.success && result.data) {
        setStats(result.data.stats)
        setMessagesByDay(result.data.charts.messagesByDay || [])
        setMessageTypes(result.data.charts.messageTypes || [])
        setRecentConversations(result.data.recentConversations || [])
        setWhatsappAccounts(result.data.whatsappAccounts || [])
        setTeamPerformance(result.data.teamPerformance || [])
        setAiInsights(result.data.aiInsights || null)
        setLiveSupportStatus(result.data.liveSupportStatus || null)
      } else {
        setFetchError(result?.error || t("errorLoadingDashboard"))
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setFetchError(t("errorLoadingDashboard"))
    } finally {
      setIsLoading(false)
    }
  }

  // RTL helper for Recharts
  const getRechartsData = <T extends any>(data: T[]): T[] => {
    return dir === 'rtl' ? [...data].reverse() : data
  }

  // Helper for dynamic colors to ensure visibility
  const getCardStyle = (baseColor: 'violet' | 'blue' | 'green' | 'slate') => {
    if (!mounted) return {}; // Prevent hydration mismatch

    const isDark = resolvedTheme === 'dark';

    const colors = {
      violet: { light: '#f5f3ff', dark: '#1e1b4b' }, // violet-50 / violet-950
      blue: { light: '#eff6ff', dark: '#172554' },   // blue-50 / blue-950
      green: { light: '#f0fdf4', dark: '#052e16' },  // green-50 / green-950
      slate: { light: '#ffffff', dark: '#020617' }   // white / slate-950
    };

    return { backgroundColor: isDark ? colors[baseColor].dark : colors[baseColor].light };
  };

  // Navigation handlers
  const handleViewAnalytics = () => {
    router.push('/analytics')
  }

  const handleAddAccount = () => {
    router.push('/accounts')
  }

  const handleConversationClick = (conversationId: string) => {
    router.push(`/inbox?id=${conversationId}`)
  }

  return (
    <AppLayout title={`${t(greetingKey)}!`} showSearch={true}>
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 text-sm text-muted-foreground">{t("loadingDashboard")}</p>
            </div>
          </div>
        ) : fetchError ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-destructive">{fetchError}</p>
            <Button variant="outline" onClick={() => fetchDashboardData()}>
              {t("retry")}
            </Button>
          </div>
        ) : (
          <>
            {isSuperAdmin ? (
              <p className="text-sm text-muted-foreground">{t("analyticsScopeSuperAdmin")}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {userRole === 'AGENT' ? t("analyticsScopeAgent") : t("analyticsScopeSupervisor")}
              </p>
            )}
            {/* Top Stats Cards - Reference Design */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Card 1: Total Conversations */}
              <Card className="rounded-2xl bg-linear-to-br from-blue-500 to-blue-500/90 border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-3 md:p-5">
                  <div className="flex items-start justify-between mb-1 md:mb-4">
                    <h3 className="text-xs md:text-sm font-medium text-white/90">{t("whatsappMessages")}</h3>
                    <div className="p-1 md:p-2 rounded-full bg-white/20">
                      <MessageSquare className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="flex-1">
                      <p className="text-2xl md:text-5xl font-bold mb-1 md:mb-3 text-white">{stats.totalMessages.toLocaleString()}</p>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-[10px] md:text-xs font-semibold">{t("activeNow")}</span>
                        <p className="text-[10px] md:text-xs text-white/80">
                          {t("messagesSentThisMonth")}{' '}
                          <span className="text-green-300 font-medium">+24%</span>
                        </p>
                      </div>
                    </div>
                    <div className="h-8 w-12 md:h-16 md:w-20 flex items-end justify-between gap-0.5">
                      <div className="w-1.5 md:w-2.5 bg-white/30 rounded-t" style={{ height: '40%' }}></div>
                      <div className="w-1.5 md:w-2.5 bg-white/45 rounded-t" style={{ height: '55%' }}></div>
                      <div className="w-1.5 md:w-2.5 bg-white/60 rounded-t" style={{ height: '70%' }}></div>
                      <div className="w-1.5 md:w-2.5 bg-white rounded-t" style={{ height: '100%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Active Contacts */}
              <Card className="rounded-2xl bg-linear-to-br from-violet-500 to-violet-500/90 border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-3 md:p-5">
                  <div className="flex items-start justify-between mb-1 md:mb-4">
                    <h3 className="text-xs md:text-sm font-medium text-white/90">{t("activeContacts")}</h3>
                    <div className="p-1 md:p-2 rounded-full bg-white/20">
                      <Users className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex items-start justify-between mb-1 md:mb-3">
                    <div>
                      <div className="flex items-baseline gap-2 md:gap-3 mb-0.5 md:mb-2">
                        <div>
                          <p className="text-xl md:text-3xl font-bold text-white">{stats.activeContacts}</p>
                          <p className="text-[10px] md:text-xs text-white/80 font-medium flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                            {t("today")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xl md:text-3xl font-bold text-white/60">{stats.totalConversations}</p>
                          <p className="text-[10px] md:text-xs text-white/80 font-medium flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                            {t("total")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="h-8 w-12 md:h-16 md:w-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { value: 30 }, { value: 50 }, { value: 65 }, { value: 45 }, { value: 70 }, { value: 55 }, { value: 60 }
                        ]}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#ffffff"
                            strokeWidth={2.5}
                            dot={false}
                            strokeOpacity={0.9}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-[10px] md:text-xs font-semibold">{t("activeNow")}</span>
                    <p className="text-[10px] md:text-xs text-green-300 font-medium">+18% {t("fromLastWeek")}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Response Time */}
              <Card className="rounded-2xl bg-linear-to-br from-primary via-primary to-primary/90 border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-3 md:p-5">
                  <div className="flex items-start justify-between mb-1 md:mb-4">
                    <h3 className="text-xs md:text-sm font-medium text-white/90">{t("averageResponseTime")}</h3>
                    <div className="p-1 md:p-2 rounded-full bg-white/20">
                      <Clock className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3 md:gap-4 mb-1 md:mb-3">
                    <div>
                      <p className="text-xl md:text-3xl font-bold text-white">{stats.avgResponseTime}</p>
                      <p className="text-[10px] md:text-xs text-white/70 mt-1">
                        {t("currentAverage")}{' '}
                        <span className="text-green-300 font-medium">-15%</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xl md:text-3xl font-bold text-white/80">1.5m</p>
                      <p className="text-[10px] md:text-xs text-white/70 mt-1">
                        {t("targetTimeGoal")}
                      </p>
                    </div>
                  </div>
                  <button onClick={handleViewAnalytics} className="w-full px-3 py-1.5 md:py-2.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-[10px] md:text-sm font-semibold transition-all flex items-center justify-center gap-1 md:gap-2 border border-white/20">
                    {t("viewResponseAnalytics")}
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="rounded-3xl shadow-sm bg-card border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{t("messagesActivity")}</CardTitle>
                      <div className="flex bg-muted/50 rounded-lg p-1">
                        <Button
                          variant={timeRange === 'week' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs px-3 shadow-none"
                          onClick={() => setTimeRange('week')}
                        >
                          {t("week")}
                        </Button>
                        <Button
                          variant={timeRange === 'month' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs px-3 shadow-none"
                          onClick={() => setTimeRange('month')}
                        >
                          {t("month")}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {messagesByDay.length > 0 && messagesByDay.some(d => d.incoming > 0 || d.outgoing > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={messagesByDay} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 11 }}
                            dy={10}
                            reversed={dir === 'rtl'}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 11 }}
                            orientation={dir === 'rtl' ? 'right' : 'left'}
                          />
                          <Tooltip
                            cursor={{ fill: '#F1F5F9' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: dir === 'rtl' ? 'right' : 'left', direction: dir }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Bar
                            dataKey="incoming"
                            name={t("incoming")}
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            barSize={timeRange === 'week' ? 32 : 12}
                          />
                          <Bar
                            dataKey="outgoing"
                            name={t("outgoing")}
                            fill="#8b5cf6"
                            radius={[4, 4, 0, 0]}
                            barSize={timeRange === 'week' ? 32 : 12}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[300px] text-center">
                        <div className="rounded-full bg-muted p-6 mb-4">
                          <TrendingUp className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{t("noMessageActivityYet")}</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          {t("startSendingMessagesTrends")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>


                {/* WhatsApp Accounts - Only for ADMIN and SUPERVISOR */}
                {getUserRole() !== 'AGENT' && (
                  <Card className="rounded-3xl shadow-sm bg-card border-border/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{t("whatsappAccounts")}</CardTitle>
                        <Button onClick={handleAddAccount} variant="outline" size="sm" className="gap-2">
                          <Plus className="h-4 w-4" />
                          {t("addAccount")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {whatsappAccounts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {whatsappAccounts.map((account) => {
                            const isActive = account.status === 'CONNECTED'
                            return (
                              <div
                                key={account.id}
                                className="group relative overflow-hidden rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200"
                              >
                                <div className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        <Smartphone className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-sm truncate max-w-[120px]">{account.name}</h4>
                                        <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'text-green-600' : 'text-red-500'}`}>
                                          {isActive ? t("online") : t("offline")}
                                        </span>
                                      </div>
                                    </div>
                                    {isActive && (
                                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                    )}
                                  </div>

                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">{account.phone}</p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <span>{account.branch || t("mainBranch")}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="rounded-full bg-muted p-6 mb-4">
                            <MessageSquare className="h-12 w-12 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">{t("noWhatsAppAccounts")}</h3>
                          <p className="text-sm text-muted-foreground max-w-sm mb-4">
                            {t("connectWhatsAppToStart")}
                          </p>
                          <Button onClick={handleAddAccount} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t("addYourFirstAccount")}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}


                {/* Team Performance - Only for ADMIN and SUPERVISOR */}
                {getUserRole() !== 'AGENT' && (
                  <Card className="rounded-3xl shadow-sm bg-card border-border/50">
                    <CardHeader>
                      <CardTitle>{t("teamPerformance")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {teamPerformance.map((metric) => (
                        <div key={metric.name} className="space-y-2">
                          <div className="flex justify-between text-sm text-start">
                            <span className="font-medium">{TEAM_METRIC_KEYS[metric.name] ? t(TEAM_METRIC_KEYS[metric.name]) : metric.name}</span>
                            <span className="text-muted-foreground ms-2">
                              {metric.current}%
                            </span>
                          </div>
                          <Progress value={metric.percentage} className="h-2" dir={dir} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* AI Quick Insights - Admin only */}
                {userRole === 'ADMIN' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                      </div>
                      <h3 className="font-bold text-lg tracking-tight">{t("aiAnalyticsInsights")}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">{t("alphaBeta")}</span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Insight 1: Peak Activity */}
                    <Card
                      className="group relative overflow-hidden rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-md"
                      style={getCardStyle('violet')}
                    >
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <Zap className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                          <div className="text-end">
                            <p className="text-[10px] text-muted-foreground dark:text-violet-300/70 font-bold uppercase tracking-widest mb-1">{t("peakActivityTitle")}</p>
                            <p className="text-base font-black text-violet-700 dark:text-violet-200">{aiInsights?.peakActivity?.day ?? t("noData")}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-end justify-between">
                            <p className="text-2xl font-black tracking-tighter text-violet-900 dark:text-violet-50">{aiInsights?.peakActivity?.time ?? "—"}</p>
                            {aiInsights?.peakActivity != null ? (
                              <p className="text-[10px] font-bold text-green-600 dark:text-green-400">+{aiInsights.peakActivity.vsAvg}% {t("vsAvg")}</p>
                            ) : null}
                          </div>
                          {aiInsights?.peakActivity != null ? (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-bold text-violet-600/70 dark:text-violet-300/90">
                                <span>{t("confidenceLevel")}</span>
                                <span>{aiInsights.peakActivity.confidence}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-violet-200/50 dark:bg-violet-900/70 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-500 dark:bg-violet-400 rounded-full rtl:ms-auto" style={{ width: `${aiInsights.peakActivity.confidence}%` }}></div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground dark:text-violet-300/70">{t("noData")}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Insight 2: Top Template */}
                    <Card
                      className="group relative overflow-hidden rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-md"
                      style={getCardStyle('blue')}
                    >
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          <div className="text-end">
                            <p className="text-[10px] text-muted-foreground dark:text-blue-300/70 font-bold uppercase tracking-widest mb-1">{t("topPerformerTitle")}</p>
                            <p className="text-base font-black text-blue-700 dark:text-blue-200">{aiInsights?.topTemplate?.name ?? t("noData")}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-end justify-between">
                            <div className="text-start">
                              <p className="text-2xl font-black tracking-tighter text-blue-900 dark:text-blue-50">{(aiInsights?.topTemplate?.responseRate ?? 0).toFixed(1)}<span className="text-sm font-medium text-blue-600/70 dark:text-blue-300/80">%</span></p>
                              <p className="text-[10px] font-bold text-blue-600/60 dark:text-blue-300/90">{t("responseRate")}</p>
                            </div>
                            <div className="flex gap-0.5 items-end h-8">
                              <div className="w-1 bg-blue-400/30 dark:bg-blue-400/20 rounded-full h-[40%]"></div>
                              <div className="w-1 bg-blue-400/50 dark:bg-blue-400/30 rounded-full h-[70%]"></div>
                              <div className="w-1 bg-blue-500 dark:bg-blue-500 rounded-full h-[55%]"></div>
                              <div className="w-1 bg-blue-600 dark:bg-blue-600 rounded-full h-[90%]"></div>
                            </div>
                          </div>
                          <div className="pt-1 flex items-center gap-1.5">
                            <div className="flex -space-x-2">
                              {[1, 2, 3].map(i => (
                                <div key={i} className="h-5 w-5 rounded-full border-2 border-white dark:border-blue-900/50 bg-blue-100 dark:bg-blue-900/70 text-blue-700 dark:text-blue-200 text-[8px] flex items-center justify-center font-bold">U{i}</div>
                              ))}
                            </div>
                            <span className="text-[10px] font-bold text-blue-600/60 dark:text-blue-300/90">
                              {aiInsights?.topTemplate != null
                                ? t("usedTimes").replace("{n}", aiInsights.topTemplate.usageCount >= 1000 ? `${(aiInsights.topTemplate.usageCount / 1000).toFixed(1)}k` : String(aiInsights.topTemplate.usageCount))
                                : t("noData")}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Insight 3: Weekly Growth */}
                    <Card
                      className="group relative overflow-hidden rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-md"
                      style={getCardStyle('green')}
                    >
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                          <div className="text-end">
                            <p className="text-[10px] text-muted-foreground dark:text-green-300/70 font-bold uppercase tracking-widest mb-1">{t("momentumTitle")}</p>
                            <p className="text-base font-black text-green-700 dark:text-green-200">
                              {aiInsights?.weeklyGrowth?.trend === 'up' ? t("fastGrowthLabel") : aiInsights?.weeklyGrowth?.trend === 'down' ? t("decliningLabel") : t("stable")}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-end justify-between">
                            <div className="text-start">
                              <p className="text-2xl font-black tracking-tighter text-green-900 dark:text-green-50">{aiInsights?.weeklyGrowth?.percentage != null && aiInsights.weeklyGrowth.percentage >= 0 ? '+' : ''}{(aiInsights?.weeklyGrowth?.percentage ?? 0).toFixed(1)}<span className="text-sm font-medium text-green-600/70 dark:text-green-300/80">%</span></p>
                              <p className="text-[10px] font-bold text-green-600/60 dark:text-green-300/90">{t("vsLast7DaysLabel")}</p>
                            </div>
                            {aiInsights?.weeklyGrowth?.trend === 'up' && (
                              <div className="p-1 px-2 rounded-lg bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] font-black flex items-center gap-1">
                                <ArrowUpRight className="h-3 w-3" />
                                {t("trending")}
                              </div>
                            )}
                            {aiInsights?.weeklyGrowth?.trend === 'down' && (
                              <div className="p-1 px-2 rounded-lg bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-[10px] font-black flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 rotate-180" />
                                {t("declining")}
                              </div>
                            )}
                            {aiInsights?.weeklyGrowth?.trend === 'stable' && (
                              <div className="p-1 px-2 rounded-lg bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 text-[10px] font-black flex items-center gap-1">
                                {t("stableBadge")}
                              </div>
                            )}
                          </div>
                          <div className="h-10 w-full relative">
                            <MomentumChart data={messagesByDay} trend={aiInsights?.weeklyGrowth?.trend} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Recent Conversations */}
                <Card className="rounded-3xl shadow-sm bg-card border-border/50">
                  <CardHeader>
                    <CardTitle>{t("recentConversations")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentConversations.length > 0 ? (
                      recentConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          onClick={() => handleConversationClick(conversation.id)}
                          className="flex items-start gap-3 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {conversation.name.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium truncate">{conversation.name}</div>
                              <div className="text-xs text-muted-foreground">{conversation.time}</div>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{conversation.lastMessage}</div>
                            {conversation.unread > 0 && (
                              <div className="mt-1">
                                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground">
                                  {conversation.unread}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="rounded-full bg-muted p-6 mb-4">
                          <MessageSquare className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{t("noConversationsYet")}</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          {t("recentConversationsAppearHere")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Message Types */}
                <Card className="rounded-3xl shadow-sm bg-card border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{t("messageTypes")}</CardTitle>
                      <Button variant="ghost" size="sm" className="h-8 pointer-events-none">
                        <span className="text-xs text-muted-foreground capitalize">{timeRange}</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {messageTypes.length > 0 && messageTypes.some(t => t.value > 0) ? (
                      <>
                        <div className="flex items-center justify-center">
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={messageTypes}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {messageTypes.map((entry: MessageType, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {messageTypes.map((type: MessageType) => (
                            <div key={type.name} className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
                              <div className="text-xs">
                                <div className="font-medium">{type.name}</div>
                                <div className="text-muted-foreground">{type.value}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[280px] text-center">
                        <div className="rounded-full bg-muted p-6 mb-4">
                          <MessageSquare className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{t("noMessagesYet")}</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          {t("messageTypeDistribution")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Live Support Status - Admin only */}
                {userRole === 'ADMIN' && (
                <Card className="rounded-3xl border shadow-sm bg-card border-border overflow-hidden relative">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-3xl opacity-50"></div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Activity className="h-4 w-4 text-green-500 dark:text-green-400 animate-pulse" />
                      </div>
                      <CardTitle className="text-base font-bold">{t("liveSupportStatus")}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-muted/50 border border-border text-start">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck className="h-3 w-3 text-blue-500 dark:text-blue-400 shrink-0" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("system")}</span>
                        </div>
                        <p className="text-sm font-black">{liveSupportStatus?.systemHealth ? (SYSTEM_HEALTH_KEYS[liveSupportStatus.systemHealth] ? t(SYSTEM_HEALTH_KEYS[liveSupportStatus.systemHealth]) : liveSupportStatus.systemHealth) : t("healthy")}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-muted/50 border border-border text-start">
                        <div className="flex items-center gap-2 mb-1">
                          <Heart className="h-3 w-3 text-red-500 dark:text-red-400 shrink-0" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("uptime")}</span>
                        </div>
                        <p className="text-sm font-black">{liveSupportStatus?.uptime || '99.9%'}</p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-1.5 px-1">
                        <span className="text-xs font-bold text-muted-foreground">{t("agentEfficiency")}</span>
                        <span className={`text-xs font-black ${liveSupportStatus?.agentEfficiency === 'Optimal' ? 'text-green-600 dark:text-green-400' :
                          liveSupportStatus?.agentEfficiency === 'Good' ? 'text-blue-600 dark:text-blue-400' :
                            liveSupportStatus?.agentEfficiency === 'Fair' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                          }`}>{liveSupportStatus?.agentEfficiency ? (AGENT_EFFICIENCY_KEYS[liveSupportStatus.agentEfficiency] ? t(AGENT_EFFICIENCY_KEYS[liveSupportStatus.agentEfficiency]) : liveSupportStatus.agentEfficiency) : t("optimal")}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-linear-to-r from-blue-500 to-green-500 rounded-full shadow-sm rtl:ms-auto" style={{ width: `${liveSupportStatus?.agentEfficiencyPercentage || 88}%` }}></div>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/logs')}
                      className="w-full py-3 rounded-2xl text-primary-foreground text-xs font-black transition-all shadow-lg flex items-center justify-center gap-2 hover:opacity-90 bg-primary cursor-pointer active:scale-95 text-start"
                    >
                      {t("viewSystemLogs")}
                      <ArrowUpRight className="h-3 w-3 rtl:rotate-180 shrink-0" />
                    </button>
                  </CardContent>
                </Card>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
