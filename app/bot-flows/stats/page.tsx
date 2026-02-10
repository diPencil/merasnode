"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { useI18n } from "@/lib/i18n"
import { authenticatedFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    Users,
    MessageSquare,
    MousePointer,
    TrendingUp,
    Calendar,
    Eye,
    CheckCircle2,
    Clock
} from "lucide-react"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts'
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

export default function BotFlowStatsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const flowId = searchParams.get('id')
    const { t } = useI18n()
    const [isLoaded, setIsLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [stats, setStats] = useState({
        filesSent: 0,
        messagesReceived: 0,
        clicks: 0,
        conversionRate: 0
    })

    // Data for charts
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [dropOffData, setDropOffData] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        setIsLoaded(true)
        fetchStats()
    }, [flowId])

    const fetchStats = async () => {
        if (!flowId) {
            setIsLoading(false)
            setError("No Flow ID provided")
            return
        }

        try {
            setIsLoading(true)
            const res = await authenticatedFetch(`/api/bot-flows/stats/${flowId}`)
            const data = await res.json()

            if (data.error) throw new Error(data.error)

            setStats(data.stats)
            setPerformanceData(data.performanceData)
            setDropOffData(data.dropOffData)
            setRecentActivity(data.recentActivity)
        } catch (err: any) {
            console.error("Error fetching stats:", err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isLoaded) return null
    if (isLoading && flowId) return (
        <AppLayout title={t("flowStatistics")}>
            <div className="flex items-center justify-center h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        </AppLayout>
    )

    return (
        <AppLayout title={t("flowStatistics")}>
            <div className="space-y-6 pb-12">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-full">
                            <ArrowLeft className="h-4 w-4 me-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">{t("flowPerformance")}</h1>
                            <p className="text-sm text-muted-foreground italic tracking-tight">{t("analyticsId")}: {flowId || 'all_flows'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-full shadow-sm">
                            <Calendar className="h-4 w-4 me-2" />
                            This Week
                        </Button>
                    </div>
                </div>

                {/* Top Metric Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="rounded-2xl shadow-soft border-none bg-white overflow-hidden group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 text-muted-foreground/70">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest">{t("totalMessages")}</CardTitle>
                            <MessageSquare className="h-4 w-4 transition-transform group-hover:scale-110" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-900">{stats.messagesReceived.toLocaleString()}</div>
                            <p className="text-[10px] text-green-600 font-black mt-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> +20.1% GROWTH
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl shadow-soft border-none bg-white overflow-hidden group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 text-muted-foreground/70">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest">{t("flowCompletions")}</CardTitle>
                            <CheckCircle2 className="h-4 w-4 transition-transform group-hover:scale-110" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-900">{stats.filesSent.toLocaleString()}</div>
                            <p className="text-[10px] text-green-600 font-black mt-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> +180.1% SURGE
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl shadow-soft border-none bg-white overflow-hidden group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 text-muted-foreground/70">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest">{t("buttonClicks")}</CardTitle>
                            <MousePointer className="h-4 w-4 transition-transform group-hover:scale-110" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-900">{stats.clicks.toLocaleString()}</div>
                            <p className="text-[10px] text-orange-600 font-black mt-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> +19% STABLE
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl shadow-soft border-none bg-white overflow-hidden group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 text-muted-foreground/70">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest">{t("conversionRate")}</CardTitle>
                            <TrendingUp className="h-4 w-4 transition-transform group-hover:scale-110" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-900">{stats.conversionRate}%</div>
                            <p className="text-[10px] text-green-600 font-black mt-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> EXCELLENT
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-7">
                    {/* Main Performance Chart */}
                    <Card className="md:col-span-4 rounded-3xl shadow-soft border-none bg-white">
                        <CardHeader className="px-6 pt-6 pb-0">
                            <CardTitle className="text-lg font-bold">{t("interactionsInsight")}</CardTitle>
                            <CardDescription>{t("interactionsInsightDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px] p-6 pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={performanceData}>
                                    <defs>
                                        <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="messages" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMessages)" strokeWidth={3} />
                                    <Area type="monotone" dataKey="completions" stroke="#10b981" fillOpacity={1} fill="url(#colorCompletions)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* User Drop-off Funnel */}
                    <Card className="md:col-span-3 rounded-3xl shadow-soft border-none bg-white">
                        <CardHeader className="px-6 pt-6 pb-0">
                            <CardTitle className="text-lg font-bold">Drop-off Funnel</CardTitle>
                            <CardDescription>{t("frictionPointsDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px] p-6 pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dropOffData} layout="vertical" margin={{ left: -20, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="step" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} width={90} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                                        {dropOffData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity Table */}
                <Card className="rounded-3xl shadow-soft border-none bg-white overflow-hidden">
                    <CardHeader className="px-8 py-6 border-b border-slate-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-black">{t("livePulse")}</CardTitle>
                                <CardDescription>Real-time interaction log for this automation.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" className="rounded-full text-xs font-bold px-4">DOWNLOAD REPORT</Button>
                        </div>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500">
                                    <th className="text-start px-8 py-4 font-black text-[10px] uppercase tracking-widest">{t("customerEntity")}</th>
                                    <th className="text-start px-8 py-4 font-black text-[10px] uppercase tracking-widest">{t("timeRegistered")}</th>
                                    <th className="text-start px-8 py-4 font-black text-[10px] uppercase tracking-widest">{t("statusMatrix")}</th>
                                    <th className="text-start px-8 py-4 font-black text-[10px] uppercase tracking-widest">Active Phase</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentActivity.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                                                    {item.contact[0]}
                                                </div>
                                                <span className="font-bold text-slate-700">{item.contact}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-slate-500 text-xs font-medium">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3 w-3 text-slate-400" />
                                                {item.date}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <Badge variant={
                                                item.status === 'Completed' ? 'success' :
                                                    item.status === 'In Progress' ? 'secondary' : 'destructive'
                                            } className="font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border-none">
                                                {item.status}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                {item.step}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </AppLayout>
    )
}

