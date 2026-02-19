"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft, Save, Plus, Trash2, Workflow, MessageSquare, ImageIcon, Clock
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { authenticatedFetch } from "@/lib/auth"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  useEdgesState,
  useNodesState,
} from "reactflow"
import "reactflow/dist/style.css"

// Helper to turn a stored media path (e.g. "/uploads/xxx.jpg")
// into a full URL for preview in the browser.
function resolveMediaUrl(path: string | undefined | null): string {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  if (typeof window === "undefined") return path
  const base = window.location.origin.replace(/\/+$/, "")
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${base}${normalized}`
}
export default function FlowBuilderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const flowId = searchParams.get('id')
  const { toast } = useToast()
  const { t } = useI18n()

  const [flow, setFlow] = useState({
    id: '',
    name: t("newFlow"),
    description: '',
    trigger: '',
    triggerKeywords: [] as string[],
    steps: [] as any[],
    isActive: false
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const imageUploadRef = useRef<HTMLInputElement>(null)

  const rebuildLinearEdges = useCallback(
    (nodesList: any[]) => {
      const ordered = nodesList
        .filter((n) => n.id !== "start")
        .sort((a, b) => (a.data?.order ?? 0) - (b.data?.order ?? 0))

      const newEdges: any[] = []
      if (ordered.length > 0) {
        newEdges.push({
          id: `e-start-${ordered[0].id}`,
          source: "start",
          target: ordered[0].id,
          type: "smoothstep",
        })
        for (let i = 0; i < ordered.length - 1; i++) {
          newEdges.push({
            id: `e-${ordered[i].id}-${ordered[i + 1].id}`,
            source: ordered[i].id,
            target: ordered[i + 1].id,
            type: "smoothstep",
          })
        }
      }
      setEdges(newEdges)
    },
    [setEdges]
  )

  const syncNodesFromSteps = useCallback(
    (steps: any[]) => {
      const startNode = {
        id: "start",
        type: "default",
        position: { x: 0, y: 0 },
        data: {
          label: t("startBotFlow") || "Start Bot Flow",
          kind: "start",
          order: -1,
        },
        style: {
          borderRadius: 16,
          padding: 12,
          background: "white",
          boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
        },
      }

      const stepNodes =
        steps?.map((step: any, index: number) => {
          const isWait = step.type === "wait"
          const isImage = step.type === "send_image"
          const isOptions = step.type === "send_options"
          const baseX = 260 * (index + 1)
          const baseY = isWait ? 140 : isImage ? 70 : isOptions ? 35 : 0
          const label = isWait
            ? (t("waitStepLabel") || "Wait")
            : isImage
              ? (t("image") || "Image")
              : isOptions
                ? (t("optionsStepLabel") || "Options")
                : (t("messageStepLabel") || "Message")
          return {
            id: `step-${index}`,
            type: "default",
            position: { x: baseX, y: baseY },
            data: {
              label,
              kind: isWait ? "wait" : isImage ? "image" : isOptions ? "options" : "message",
              order: index,
            },
            style: {
              borderRadius: 16,
              padding: 12,
              background: "white",
              boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
            },
          }
        }) || []

      const allNodes = [startNode, ...stepNodes]
      setNodes(allNodes)
      rebuildLinearEdges(allNodes)
    },
    [rebuildLinearEdges, setNodes, t]
  )

  const syncStepsFromNodes = useCallback(
    (nodesList: any[], prevSteps: any[]) => {
      const ordered = nodesList
        .filter((n) => n.id !== "start")
        .sort((a, b) => (a.data?.order ?? 0) - (b.data?.order ?? 0))

      return ordered.map((n, idx) => {
        const prev = prevSteps[idx] || {}
        if (n.data?.kind === "wait") {
          return {
            type: "wait",
            delay: typeof prev.delay === "number" ? prev.delay : 1000,
          }
        }
        if (n.data?.kind === "image") {
          return {
            type: "send_image",
            mediaUrl: typeof prev.mediaUrl === "string" ? prev.mediaUrl : "",
            content: typeof prev.content === "string" ? prev.content : "",
            delay: typeof prev.delay === "number" ? prev.delay : 0,
          }
        }
        if (n.data?.kind === "options") {
          return {
            type: "send_options",
            content: typeof prev.content === "string" ? prev.content : "",
            options: Array.isArray(prev.options) ? prev.options : prev.options || [],
          }
        }
        return {
          type: "send_message",
          content: typeof prev.content === "string" ? prev.content : "",
          delay: typeof prev.delay === "number" ? prev.delay : 0,
        }
      })
    },
    []
  )

  // Load flow data if editing, otherwise init default nodes
  useEffect(() => {
    if (flowId) {
      fetchFlow(flowId)
    } else {
      syncNodesFromSteps([])
    }
  }, [flowId, syncNodesFromSteps])

  const fetchFlow = async (id: string) => {
    setIsLoading(true)
    try {
      // In a real app, you might have a specific endpoint for fetching a single flow or filter by ID
      // Reusing the list endpoint for now, or assume this endpoint handles single ID if implemented
      // Ideally: GET /api/bot-flows?id=... or GET /api/bot-flows/[id]
      // Based on route.ts seen earlier, GET accepts params but returns a list.
      // Let's assume we can fetch list and find it, or the API supports it.
      // Actually, looking at route.ts, GET filters by 'active' but doesn't explicitly look like it handles ID.
      // Wait, route.ts has PATCH for update.
      // Let's assume we fetch all and find it for now to avoid changing backend if possible, or try to fetch.

      const response = await authenticatedFetch(`/api/bot-flows`)
      const data = await response.json()

      if (data.success && data.data) {
        const foundFlow = data.data.find((f: any) => f.id === id)
        if (foundFlow) {
          const nextFlow = {
            id: foundFlow.id,
            name: foundFlow.name,
            description: foundFlow.description || '',
            trigger: foundFlow.trigger,
            triggerKeywords: Array.isArray(foundFlow.triggerKeywords) ? foundFlow.triggerKeywords : [],
            steps: foundFlow.steps || [],
            isActive: foundFlow.isActive
          }
          setFlow(nextFlow)
          syncNodesFromSteps(nextFlow.steps)
        } else {
          toast({ title: t("errorTitle"), description: t("flowNotFound"), variant: "destructive" })
        }
      }
    } catch (error) {
      console.error('Error fetching flow:', error)
      toast({ title: t("errorTitle"), description: t("failedToLoadFlow"), variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  // Save flow
  const saveFlow = async () => {
    if (!flow.name.trim()) {
      toast({
        title: t("errorTitle"),
        description: t("pleaseEnterFlowName"),
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)

    try {
      const isEditing = !!flow.id
      const method = isEditing ? 'PATCH' : 'POST'

      // Sync steps from nodes before saving
      const latestSteps = syncStepsFromNodes(nodes, flow.steps)

      const payload: any = { ...flow, steps: latestSteps }
      if (flow.trigger === 'incoming_message' && Array.isArray(flow.triggerKeywords)) {
        payload.triggerKeywords = flow.triggerKeywords.filter(Boolean).map((k: string) => String(k).trim())
      } else if (flow.trigger !== 'incoming_message') {
        payload.triggerKeywords = null
      }
      const response = await authenticatedFetch('/api/bot-flows', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Flow saved successfully",
        })
        router.push('/bot-flows')
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error saving flow:', error)
      toast({
        title: "Error",
        description: "Failed to save flow",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addStepNode = (kind: "message" | "wait" | "image" | "options") => {
    setFlow(prev => {
      const len = prev.steps.length
      const nextSteps = [
        ...prev.steps,
        kind === "wait"
          ? { type: "wait", delay: 1000 }
          : kind === "image"
            ? { type: "send_image", mediaUrl: "", content: "", delay: 0 }
            : kind === "options"
              ? {
                type: "send_options",
                content: "كيف نقدر نساعدك؟",
                options: [
                  { label: "مواعيد", value: "1", nextStepIndex: -1 },
                  { label: "أسعار", value: "2", nextStepIndex: -1 },
                  { label: "تكلم مع موظف", value: "3", nextStepIndex: -1 },
                ],
              }
              : { type: "send_message", content: "", delay: 0 }
      ]
      syncNodesFromSteps(nextSteps)
      return { ...prev, steps: nextSteps }
    })
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds => addEdge({ ...connection, type: "smoothstep" }, eds))
    },
    [setEdges]
  )

  const selectedStep = useMemo(() => {
    if (!selectedNodeId || selectedNodeId === "start") return null
    const node = nodes.find((n: any) => n.id === selectedNodeId)
    if (!node) return null
    const order = node.data?.order ?? 0
    const step = flow.steps[order]
    if (!step) return null
    return { node, index: order, step }
  }, [flow.steps, nodes, selectedNodeId])

  const updateSelectedStep = (updater: (prev: any) => any) => {
    if (!selectedStep) return
    const idx = selectedStep.index
    setFlow(prev => {
      const copy = [...prev.steps]
      copy[idx] = updater(copy[idx] || {})
      return { ...prev, steps: copy }
    })
  }

  const deleteSelectedNode = () => {
    if (!selectedStep) return
    const idx = selectedStep.index
    setFlow(prev => {
      const nextSteps = prev.steps.filter((_, i) => i !== idx)
      syncNodesFromSteps(nextSteps)
      return { ...prev, steps: nextSteps }
    })
    setSelectedNodeId(null)
  }

  return (
    <AppLayout title={t("flowBuilder")}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{flow.name}</h1>
              <p className="text-muted-foreground">Create your automated workflow</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="flow-active">Active</Label>
              <Switch
                id="flow-active"
                checked={flow.isActive}
                onCheckedChange={(checked) => setFlow(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
            <Button onClick={saveFlow} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin me-2" />
                  {t("savingFlow")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 me-2" />
                  {t("saveFlow")}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Flow Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>{t("flowConfiguration")}</CardTitle>
            <CardDescription>{t("configureBasicSettingsBotFlow")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="flow-name">{t("flowNameLabel")}</Label>
                <Input
                  id="flow-name"
                  value={flow.name}
                  onChange={(e) => setFlow(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t("flowNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flow-trigger">{t("triggerLabel")}</Label>
                <select
                  id="flow-trigger"
                  value={flow.trigger}
                  onChange={(e) => setFlow(prev => ({ ...prev, trigger: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">{t("selectTriggerPlaceholder")}</option>
                  <option value="incoming_message">{t("triggerIncomingMessage")}</option>
                  <option value="new_contact">{t("triggerNewContact")}</option>
                  <option value="new_message">{t("triggerNewMessage")}</option>
                  <option value="booking_scheduled">{t("triggerBookingScheduled")}</option>
                  <option value="invoice_due">{t("triggerInvoiceDue")}</option>
                  <option value="service_completed">{t("triggerServiceCompleted")}</option>
                </select>
              </div>
            </div>
            {flow.trigger === "incoming_message" && (
              <div className="space-y-2">
                <Label htmlFor="flow-trigger-keywords">{t("triggerKeywordsLabel")}</Label>
                <Input
                  id="flow-trigger-keywords"
                  value={Array.isArray(flow.triggerKeywords) ? flow.triggerKeywords.join(", ") : ""}
                  onChange={(e) =>
                    setFlow(prev => ({
                      ...prev,
                      triggerKeywords: e.target.value
                        .split(",")
                        .map((k) => k.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder={t("triggerKeywordsPlaceholder")}
                />
                <p className="text-xs text-muted-foreground">{t("triggerKeywordsHint")}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="flow-desc">{t("descriptionLabel")}</Label>
              <Textarea
                id="flow-desc"
                value={flow.description}
                onChange={(e) => setFlow(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t("describeFlowPlaceholder")}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visual Flow Builder */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)] gap-4">
          <Card className="h-[520px] lg:h-[560px] overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-primary" />
                {t("flowCanvas") || "Flow Canvas"}
              </CardTitle>
              <CardDescription>
                {t("flowCanvasHint") || "Click nodes to edit details, and add new steps from the panel."}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[440px] lg:h-[480px] p-0">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                className="bg-slate-50/60 dark:bg-slate-900/60"
              >
                <Background gap={16} color="#e2e8f0" />
                <MiniMap pannable zoomable />
                <Controls position="bottom-right" />
              </ReactFlow>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Workflow className="h-4 w-4 text-primary" />
                  {t("availableSteps") || "Available Steps"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("dragOrClickToAddStep") || "Click a step type to append it to the flow."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => addStepNode("message")}
                >
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {t("text") || "Text message"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => addStepNode("wait")}
                >
                  <Clock className="h-4 w-4 text-primary" />
                  {t("waitStepLabel") || "Wait / Delay"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => addStepNode("image")}
                >
                  <ImageIcon className="h-4 w-4 text-primary" />
                  {t("image") || "Image"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => addStepNode("options")}
                >
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {t("optionsStepLabel") || "خيارات (ترحيب + أزرار)"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("stepDetails") || "Step Details"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("clickNodeToEdit") || "Select a node from the canvas to edit."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!selectedStep ? (
                  <p className="text-xs text-muted-foreground">
                    {t("noStepSelected") || "No step selected."}
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-muted-foreground">
                      {selectedStep.step.type === "wait"
                        ? (t("waitStepLabel") || "Wait step")
                        : selectedStep.step.type === "send_image"
                          ? (t("image") || "Image step")
                          : selectedStep.step.type === "send_options"
                            ? (t("optionsStepLabel") || "Options step")
                            : (t("messageStepLabel") || "Message step")}
                    </p>
                    {selectedStep.step.type === "send_options" && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs">{t("botFlowMessageContent") || "الرسالة"}</Label>
                          <Textarea
                            rows={2}
                            value={selectedStep.step.content || ""}
                            onChange={(e) =>
                              updateSelectedStep(prev => ({ ...prev, type: "send_options", content: e.target.value }))
                            }
                            placeholder={t("optionsStepWelcomeMessagePlaceholder")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">{t("optionNextStepLabel")}</Label>
                          {(Array.isArray(selectedStep.step.options) ? selectedStep.step.options : []).map((opt: any, i: number) => (
                            <div key={i} className="flex gap-2 items-center">
                              <Input
                                className="flex-1"
                                placeholder={t("optionLabelPlaceholder")}
                                value={opt.label || ""}
                                onChange={(e) => {
                                  const opts = [...(selectedStep.step.options || [])]
                                  opts[i] = { ...opts[i], label: e.target.value, value: String(i + 1) }
                                  updateSelectedStep(prev => ({ ...prev, type: "send_options", options: opts }))
                                }}
                              />
                              <Input
                                type="number"
                                className="w-16"
                                placeholder="-1"
                                value={opt.nextStepIndex ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value
                                  const num = v === "" || v === "-" ? -1 : parseInt(v, 10)
                                  const opts = [...(selectedStep.step.options || [])]
                                  opts[i] = { ...opts[i], nextStepIndex: isNaN(num) ? -1 : num }
                                  updateSelectedStep(prev => ({ ...prev, type: "send_options", options: opts }))
                                }}
                              />
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const opts = [...(selectedStep.step.options || []), { label: "", value: String((selectedStep.step.options || []).length + 1), nextStepIndex: -1 }]
                              updateSelectedStep(prev => ({ ...prev, type: "send_options", options: opts }))
                            }}
                          >
                            {t("addOption")}
                          </Button>
                        </div>
                      </div>
                    )}
                    {selectedStep.step.type === "send_message" && (
                      <div className="space-y-2">
                        <Label className="text-xs">
                          {t("botFlowMessageContent") || "Message content"}
                        </Label>
                        <Textarea
                          rows={4}
                          value={selectedStep.step.content || ""}
                          onChange={(e) =>
                            updateSelectedStep(prev => ({
                              ...prev,
                              type: "send_message",
                              content: e.target.value,
                            }))
                          }
                          placeholder={t("botFlowTypeYourMessage") || "اكتب رسالة البوت هنا..."}
                        />
                      </div>
                    )}
                    {selectedStep.step.type === "send_image" && (
                      <div className="space-y-2">
                        <input
                          ref={imageUploadRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            try {
                              const form = new FormData()
                              form.append("file", file)
                              const res = await authenticatedFetch("/api/upload", { method: "POST", body: form })
                              const data = await res.json()
                              if (data.success && data.path) {
                                updateSelectedStep(prev => ({ ...prev, type: "send_image", mediaUrl: data.path }))
                                toast({ title: t("success") || "Success", description: t("imageUploaded") || "Image uploaded" })
                              } else {
                                toast({ title: t("errorTitle"), description: data.error || "Upload failed", variant: "destructive" })
                              }
                            } catch {
                              toast({ title: t("errorTitle"), description: "Upload failed", variant: "destructive" })
                            }
                            e.target.value = ""
                          }}
                        />
                        <Label className="text-xs">{t("image") || "Image"}</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => imageUploadRef.current?.click()}
                          >
                            <ImageIcon className="h-3 w-3 me-1" />
                            {selectedStep.step.mediaUrl ? (t("changeImage") || "Change image") : (t("uploadImage") || "Upload image")}
                          </Button>
                        </div>
                        {selectedStep.step.mediaUrl && (
                          <div className="space-y-1">
                            <p
                              className="text-[11px] text-muted-foreground truncate"
                              title={selectedStep.step.mediaUrl}
                            >
                              {selectedStep.step.mediaUrl}
                            </p>
                            <div className="border rounded-md overflow-hidden bg-muted/40">
                              <img
                                src={resolveMediaUrl(selectedStep.step.mediaUrl)}
                                alt="Flow image preview"
                                className="max-h-40 w-full object-contain bg-black/5"
                              />
                            </div>
                          </div>
                        )}
                        <Label className="text-xs">{t("imageCaption") || "Caption (optional)"}</Label>
                        <Textarea
                          rows={2}
                          value={selectedStep.step.content || ""}
                          onChange={(e) =>
                            updateSelectedStep(prev => ({ ...prev, type: "send_image", content: e.target.value }))
                          }
                          placeholder={t("botFlowTypeYourMessage") || "Caption for the image..."}
                        />
                      </div>
                    )}
                    {selectedStep.step.type === "wait" && (
                      <div className="space-y-2">
                        <Label className="text-xs">
                          {t("waitDurationMs") || "Wait duration (ms)"}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={selectedStep.step.delay ?? 1000}
                          onChange={(e) =>
                            updateSelectedStep(prev => ({
                              ...prev,
                              type: "wait",
                              delay: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={deleteSelectedNode}
                    >
                      <Trash2 className="h-3 w-3 me-1" />
                      {t("deleteStep") || "Delete step"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}