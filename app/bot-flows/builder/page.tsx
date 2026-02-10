"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft, Save, Plus, Trash2, Settings, Workflow
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { authenticatedFetch } from "@/lib/auth"


export default function FlowBuilderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const flowId = searchParams.get('id')
  const { toast } = useToast()

  const [flow, setFlow] = useState({
    id: '',
    name: 'New Flow',
    description: '',
    trigger: '',
    steps: [] as any[],
    isActive: false
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load flow data if editing
  useEffect(() => {
    if (flowId) {
      fetchFlow(flowId)
    }
  }, [flowId])

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
          setFlow({
            id: foundFlow.id,
            name: foundFlow.name,
            description: foundFlow.description || '',
            trigger: foundFlow.trigger,
            steps: foundFlow.steps || [],
            isActive: foundFlow.isActive
          })
        } else {
          toast({ title: "Error", description: "Flow not found", variant: "destructive" })
        }
      }
    } catch (error) {
      console.error('Error fetching flow:', error)
      toast({ title: "Error", description: "Failed to load flow", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  // Save flow
  const saveFlow = async () => {
    if (!flow.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a flow name",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)

    try {
      const isEditing = !!flow.id
      const method = isEditing ? 'PATCH' : 'POST'

      // If editing, we need to send ID in body (as per route.ts PATCH handler)
      // If creating, we don't send ID

      const response = await authenticatedFetch('/api/bot-flows', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flow)
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



  return (
    <AppLayout title={t("flowBuilder")}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 me-2" />
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 me-2" />
                  Save Flow
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Flow Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Flow Configuration</CardTitle>
            <CardDescription>Configure the basic settings for your bot flow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="flow-name">Flow Name</Label>
                <Input
                  id="flow-name"
                  value={flow.name}
                  onChange={(e) => setFlow(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Welcome Message Flow"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flow-trigger">Trigger</Label>
                <select
                  id="flow-trigger"
                  value={flow.trigger}
                  onChange={(e) => setFlow(prev => ({ ...prev, trigger: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select trigger...</option>
                  <option value="new_contact">New Contact</option>
                  <option value="new_message">New Message</option>
                  <option value="booking_scheduled">Booking Scheduled</option>
                  <option value="invoice_due">Invoice Due</option>
                  <option value="service_completed">Service Completed</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flow-desc">Description</Label>
              <Textarea
                id="flow-desc"
                value={flow.description}
                onChange={(e) => setFlow(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this flow does..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Steps Builder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Flow Steps
              <Button
                size="sm"
                onClick={() => setFlow(prev => ({
                  ...prev,
                  steps: [...prev.steps, {
                    type: 'send_message',
                    content: '',
                    delay: 0
                  }]
                }))}
              >
                <Plus className="h-4 w-4 me-2" />
                Add Step
              </Button>
            </CardTitle>
            <CardDescription>Define the actions your bot will take</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {flow.steps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Workflow className="h-12 w-12 mx-auto opacity-50 mb-4" />
                <p>No steps defined yet. Add your first step to get started.</p>
              </div>
            ) : (
              flow.steps.map((step, index) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <select
                            value={step.type}
                            onChange={(e) => {
                              const newSteps = [...flow.steps]
                              newSteps[index] = { ...step, type: e.target.value }
                              setFlow(prev => ({ ...prev, steps: newSteps }))
                            }}
                            className="px-3 py-1 border rounded-md text-sm"
                          >
                            <option value="send_message">Send Message</option>
                            <option value="wait">Wait</option>
                            <option value="assign_agent">Assign Agent</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newSteps = flow.steps.filter((_, i) => i !== index)
                              setFlow(prev => ({ ...prev, steps: newSteps }))
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {step.type === 'send_message' && (
                          <div className="space-y-2">
                            <Label>Message Content</Label>
                            <Textarea
                              placeholder="Enter message to send..."
                              value={step.content || ''}
                              onChange={(e) => {
                                const newSteps = [...flow.steps]
                                newSteps[index] = { ...step, content: e.target.value }
                                setFlow(prev => ({ ...prev, steps: newSteps }))
                              }}
                              rows={3}
                            />
                          </div>
                        )}

                        {step.type === 'wait' && (
                          <div className="space-y-2">
                            <Label>Wait Duration (milliseconds)</Label>
                            <Input
                              type="number"
                              value={step.delay || 1000}
                              onChange={(e) => {
                                const newSteps = [...flow.steps]
                                newSteps[index] = { ...step, delay: parseInt(e.target.value) || 1000 }
                                setFlow(prev => ({ ...prev, steps: newSteps }))
                              }}
                            />
                          </div>
                        )}

                        {step.type === 'assign_agent' && (
                          <div className="space-y-2">
                            <Label>Agent ID</Label>
                            <Input
                              placeholder="Enter agent ID"
                              value={step.agentId || ''}
                              onChange={(e) => {
                                const newSteps = [...flow.steps]
                                newSteps[index] = { ...step, agentId: e.target.value }
                                setFlow(prev => ({ ...prev, steps: newSteps }))
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Visual Builder Placeholder */}
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Workflow className="h-16 w-16 mx-auto opacity-50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Visual Flow Builder</h3>
            <p className="text-muted-foreground mb-4">
              A drag-and-drop visual builder (like n8n) will be available here soon.
              For now, use the form above to create your flows.
            </p>
            <Button variant="outline">
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}