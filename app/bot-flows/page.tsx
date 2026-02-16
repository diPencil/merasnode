"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Search, Plus, Workflow, Play, Pause, Loader2, MessageSquare, Send, GitBranch, FileText } from "lucide-react"
import { mockBotFlows } from "@/lib/mock-data"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { authenticatedFetch, getUserRole } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"

interface BotFlow {
  id: string
  name: string
  description?: string
  trigger: string
  steps: any[]
  isActive: boolean
  status?: string
  createdAt: Date
  updatedAt: Date
  createdBy?: { id: string; name: string } | null
}

export default function BotFlowsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [botFlows, setBotFlows] = useState<BotFlow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const { t } = useI18n()
  const { toast } = useToast()
  const userRole = getUserRole() as UserRole | null
  const canEditBotFlow = userRole ? hasPermission(userRole, "edit_bot_flow") : false

  // Fetch bot flows from API or use mock data
  useEffect(() => {
    fetchBotFlows()
  }, [])

  const fetchBotFlows = async () => {
    try {
      setIsLoading(true)
      const response = await authenticatedFetch('/api/bot-flows')
      const data = await response.json()

      if (data.success && data.data?.length > 0) {
        // Use real data from database
        setBotFlows((data.data || []).map((flow: any) => ({
          ...flow,
          status: flow.isActive ? 'active' : 'inactive',
          updatedAt: new Date(flow.updatedAt)
        })))
      } else {
        // Use mock data for demo
        setBotFlows(mockBotFlows.map(flow => ({
          ...flow,
          status: flow.isActive ? 'active' : 'inactive'
        })))
      }
    } catch (error) {
      console.error('Error fetching bot flows:', error)
      // Fallback to mock data
      setBotFlows(mockBotFlows.map(flow => ({
        ...flow,
        status: flow.isActive ? 'active' : 'inactive'
      })))
    } finally {
      setIsLoading(false)
    }
  }

  const toggleBotFlowStatus = async (flowId: string, currentStatus: boolean) => {
    try {
      setIsUpdating(flowId)
      const newStatus = !currentStatus

      // Update in database if exists, otherwise just update local state
      try {
        const response = await authenticatedFetch(`/api/bot-flows/${flowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: newStatus })
        })

        if (!response.ok) {
          throw new Error('API update failed')
        }
      } catch (apiError) {
        console.log('API update failed, updating local state only')
      }

      // Update local state
      setBotFlows(prev => prev.map(flow =>
        flow.id === flowId
          ? { ...flow, isActive: newStatus, status: newStatus ? 'active' : 'inactive' }
          : flow
      ))

      toast({
        title: t("success"),
        description: newStatus ? t("botFlowActivatedSuccess") : t("botFlowDeactivatedSuccess"),
      })
    } catch (error) {
      console.error("Error updating bot flow:", error)
      toast({
        title: t("error"),
        description: t("failedToUpdateBotFlowStatus"),
        variant: "destructive"
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const filteredFlows = botFlows.filter((flow) => {
    const query = searchQuery.toLowerCase()
    return (
      flow.name.toLowerCase().includes(query) ||
      (flow.description && flow.description.toLowerCase().includes(query)) ||
      flow.trigger.toLowerCase().includes(query)
    )
  })

  if (isLoading) {
    return (
      <AppLayout title={t("botFlows")}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title={t("botFlows")}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("searchBotFlows")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-full bg-card ps-10 shadow-soft"
            />
          </div>
          <Button
            onClick={() => router.push('/bot-flows/create')}
            className="rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
          >
            <Plus className="me-2 h-4 w-4" />
            {t("createBotFlow")}
          </Button>
        </div>

        {/* Bot Flows Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredFlows.length === 0 ? (
            <div className="col-span-full flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Workflow className="h-16 w-16 mx-auto opacity-50 mb-4" />
                <p className="text-lg font-medium">{t("noBotFlowsFound")}</p>
                <p className="text-sm">{t("createFirstBotFlow")}</p>
              </div>
            </div>
          ) : (
            filteredFlows.map((flow) => (
              <Card key={flow.id} className="rounded-2xl shadow-soft">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{flow.name}</CardTitle>
                      </div>
                      <CardDescription className="mt-2">{flow.description}</CardDescription>
                      {flow.createdBy?.name && (
                        <p className="text-xs text-muted-foreground mt-1">{t("createdBy")}: {flow.createdBy.name}</p>
                      )}
                    </div>
                    <Switch
                      checked={flow.isActive}
                      onCheckedChange={() => toggleBotFlowStatus(flow.id, flow.isActive)}
                      disabled={isUpdating === flow.id || !canEditBotFlow}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground">{t("triggerLabel")}</p>
                    <p className="mt-1 text-sm">{flow.trigger}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("stepsLabel")}</span>
                    <Badge variant="secondary" className="rounded-full">
                      {Array.isArray(flow.steps) ? flow.steps.length : flow.steps}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("status")}</span>
                    <Badge variant={flow.status === "active" ? "default" : "secondary"} className="rounded-full">
                      {flow.status === "active" ? (
                        <>
                          <Play className="me-1 h-3 w-3" />
                          {t("active")}
                        </>
                      ) : (
                        <>
                          <Pause className="me-1 h-3 w-3" />
                          {t("inactive")}
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground">Updated {format(flow.updatedAt, "MMM dd, yyyy")}</div>

                  <div className="flex gap-2 pt-2">
                    {canEditBotFlow && (
                      <Button
                        size="sm"
                        className="flex-1 rounded-full"
                        onClick={() => router.push(`/bot-flows/builder?id=${flow.id}`)}
                      >
                        {t("editFlow")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-full bg-transparent"
                      onClick={() => router.push(`/bot-flows/stats?id=${flow.id}`)}
                    >
                      {t("viewStats")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Flow Builder */}
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Visual Flow Builder
            </CardTitle>
            <CardDescription>Build automated workflows with drag-and-drop</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/bot-flows/builder')}
                  className="flex items-center gap-2"
                >
                  <Workflow className="h-4 w-4" />
                  {t("openFlowBuilder")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/bot-flows/templates')}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {t("flowTemplates")}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/10">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm font-medium">{t("triggersLabel")}</p>
                  <p className="text-xs text-muted-foreground">{t("startYourFlow")}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm font-medium">{t("actionsLabelShort")}</p>
                  <p className="text-xs text-muted-foreground">{t("whatHappensNext")}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <GitBranch className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-sm font-medium">{t("conditionsLabel")}</p>
                  <p className="text-xs text-muted-foreground">{t("makeDecisions")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
