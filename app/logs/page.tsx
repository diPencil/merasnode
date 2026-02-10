"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { useI18n } from "@/lib/i18n"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { Activity, User, Monitor, Globe, Filter, X } from "lucide-react"
import { authenticatedFetch } from "@/lib/auth"

interface Log {
  id: string
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: any
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  } | null
}

export default function LogsPage() {
  const { t, language } = useI18n()
  const [logs, setLogs] = useState<Log[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  useEffect(() => {
    fetchLogs()
  }, [actionFilter, entityFilter])

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      let url = '/api/logs?limit=100'

      if (actionFilter !== "all") {
        url += `&action=${actionFilter}`
      }
      if (entityFilter !== "all") {
        url += `&entityType=${entityFilter}`
      }

      const response = await authenticatedFetch(url)
      const data = await response.json()

      if (data.success) {
        setLogs(data.data || [])
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch logs')
      }
    } catch (err) {
      setError(t("failedToConnectToServer"))
      console.error('Error fetching logs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearFilters = () => {
    setActionFilter("all")
    setEntityFilter("all")
  }

  const hasActiveFilters = actionFilter !== "all" || entityFilter !== "all"

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
      case 'UPDATE': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      case 'DELETE': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'LOGIN': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800'
    }
  }

  return (
    <AppLayout title={t("activityLogs")}>
      <div className="space-y-4 md:space-y-6">
        {/* Header - Optimized for mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex flex-col">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{t("activityLogs")}</h2>
              <p className="text-xs md:text-sm text-muted-foreground">{t("trackActivityLogs")}</p>
            </div>
            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden h-8 w-8 shrink-0"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full self-start sm:self-auto">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap">{logs.length} {t("activities")}</span>
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse ms-1"></span>
          </div>
        </div>

        {/* Filters - Collapsible on Mobile */}
        <div className={`${isFiltersOpen ? 'block' : 'hidden'} md:block transition-all duration-300 ease-in-out`}>
          <Card className="rounded-xl border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-4 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">{t("filters")}</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1.5 px-2 hover:bg-destructive/10 hover:text-destructive">
                  <X className="h-3 w-3" />
                  {t("clearFilters")}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground ms-1">{t("actionType")}</label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="h-9 w-full bg-background/50">
                      <SelectValue placeholder={t("allActions")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allActions")}</SelectItem>
                      <SelectItem value="CREATE">Create</SelectItem>
                      <SelectItem value="UPDATE">Update</SelectItem>
                      <SelectItem value="DELETE">Delete</SelectItem>
                      <SelectItem value="LOGIN">Login</SelectItem>
                      <SelectItem value="LOGOUT">Logout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground ms-1">{t("entityType")}</label>
                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="h-9 w-full bg-background/50">
                      <SelectValue placeholder={t("allEntities")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allEntities")}</SelectItem>
                      <SelectItem value="Contact">Contact</SelectItem>
                      <SelectItem value="Conversation">Conversation</SelectItem>
                      <SelectItem value="Message">Message</SelectItem>
                      <SelectItem value="Template">Template</SelectItem>
                      <SelectItem value="User">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl border shadow-sm overflow-hidden min-h-[300px]">
          <CardHeader className="p-4 md:p-6 pb-2 border-b bg-muted/5">
            <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
              <Monitor className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              {t("recentActivity")}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">{t("recentActivityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full border-4 border-primary/20 animate-spin border-t-primary"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">{t("loadingActivityLogs")}</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <X className="h-6 w-6 text-destructive" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">{error}</p>
                  <p className="text-xs text-muted-foreground">{t("failedToConnectDesc") || "Check your connection and try again"}</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLogs} className="mt-2">
                  {t("tryAgain")}
                </Button>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Filter className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t("noActivityLogs")}</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="text-primary text-xs h-auto p-0">
                    {t("clearFilters")}
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile: Compact List */}
                <div className="md:hidden divide-y">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 hover:bg-muted/50 transition-colors flex flex-col gap-2 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge className={`rounded-full px-2 py-0 border text-[10px] font-semibold uppercase tracking-wider ${getActionColor(log.action)}`}>
                            {log.action}
                          </Badge>
                          <span className="text-xs font-medium truncate text-foreground/80">{log.entityType}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                          {format(new Date(log.createdAt), "MMM dd, HH:mm")}
                        </span>
                      </div>

                      <div className="flex gap-3 ps-1">
                        <div className="w-0.5 bg-border rounded-full h-auto self-stretch my-1 opacity-50"></div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {log.metadata?.description || t("noDescription")}
                          </p>
                          <div className="flex items-center gap-3 pt-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded-md">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-[80px]">{log.metadata?.userName || log.user?.name || "System"}</span>
                            </div>
                            {log.ipAddress && (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                                <Globe className="h-3 w-3" />
                                <span className="truncate max-w-[80px]">{log.ipAddress}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-start font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 h-10">{t("action")}</TableHead>
                        <TableHead className="text-start font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 h-10">{t("entity")}</TableHead>
                        <TableHead className="text-start font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 h-10">{t("userRole")}</TableHead>
                        <TableHead className="text-start font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 h-10 w-[30%]">{t("details")}</TableHead>
                        <TableHead className="text-start font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 h-10">{t("device")}</TableHead>
                        <TableHead className="text-start font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 h-10">{t("timestamp")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id} className="border-border/30 hover:bg-muted/30 group transition-colors">
                          <TableCell className="py-3">
                            <Badge className={`rounded-full px-2.5 py-0.5 border shadow-sm ${getActionColor(log.action)}`}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-sm">{log.entityType}</span>
                              {log.entityId && (
                                <span className="text-[10px] font-mono text-muted-foreground bg-muted w-fit px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">ID: {log.entityId.slice(0, 8)}...</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                {(log.metadata?.userName || log.user?.name || "SY")[0]}
                              </div>
                              <span className="text-sm font-medium">{log.metadata?.userName || log.user?.name || "System"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed max-w-sm" title={log.metadata?.description}>
                              {log.metadata?.description || "-"}
                            </p>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-start gap-2">
                              <Monitor className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                              <div className="flex flex-col text-[11px] leading-tight text-muted-foreground">
                                <span>{log.metadata?.device || "Unknown"}</span>
                                <span className="opacity-70">{log.ipAddress}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col text-xs font-medium text-muted-foreground">
                              <span>{format(new Date(log.createdAt), "MMM dd, yyyy")}</span>
                              <span className="text-[10px] opacity-70">{format(new Date(log.createdAt), "HH:mm:ss")}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
