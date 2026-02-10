"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { authenticatedFetch } from "@/lib/auth"

interface Step {
  id: string
  type: 'send_message' | 'wait' | 'conditional'
  content?: string
  delay?: number
  condition?: string
  trueSteps?: Step[]
  falseSteps?: Step[]
}

interface QuickCreateBotFlowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function QuickCreateBotFlowDialog({ open, onOpenChange, onSuccess }: QuickCreateBotFlowDialogProps) {
  const { toast } = useToast()
  const { t } = useI18n()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: '',
    isActive: true,
  })
  const [steps, setSteps] = useState<Step[]>([
    { id: '1', type: 'send_message', content: '', delay: 0 },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addStep = () => {
    setSteps((s) => [
      ...s,
      { id: Date.now().toString(), type: 'send_message', content: '', delay: 0 },
    ])
  }

  const removeStep = (stepId: string) => {
    setSteps((s) => s.filter((step) => step.id !== stepId))
  }

  const updateStep = (stepId: string, updates: Partial<Step>) => {
    setSteps((s) =>
      s.map((step) => (step.id === stepId ? { ...step, ...updates } : step))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.trigger.trim() || steps.length === 0) {
      toast({
        title: t("errorTitle"),
        description: t("pleaseFillAllRequiredFields"),
        variant: "destructive",
      })
      return
    }
    setIsSubmitting(true)
    try {
      const response = await authenticatedFetch('/api/bot-flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, steps }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: t("successTitle"), description: t("botFlowCreatedSuccess") })
        onOpenChange(false)
        setFormData({ name: '', description: '', trigger: '', isActive: true })
        setSteps([{ id: '1', type: 'send_message', content: '', delay: 0 }])
        onSuccess?.()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create bot flow",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setFormData({ name: '', description: '', trigger: '', isActive: true })
      setSteps([{ id: '1', type: 'send_message', content: '', delay: 0 }])
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[90vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createBotFlow")}</DialogTitle>
          <DialogDescription>{t("createAutomatedWorkflow")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle>{t("basicInformation")}</CardTitle>
              <CardDescription>{t("configureBasicSettings")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qcb-name">{t("flowName")} *</Label>
                  <Input
                    id="qcb-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t("flowNamePlaceholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qcb-trigger">{t("triggerLabel")} *</Label>
                  <Input
                    id="qcb-trigger"
                    value={formData.trigger}
                    onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                    placeholder={t("flowTriggerPlaceholder")}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qcb-desc">{t("descriptionLabel")}</Label>
                <Textarea
                  id="qcb-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("describeFlowPlaceholder")}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="qcb-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="qcb-active">{t("activateFlowImmediately")}</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("flowSteps")}</CardTitle>
                  <CardDescription>{t("defineActionsBotTakes")}</CardDescription>
                </div>
                <Button type="button" onClick={addStep} className="rounded-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addStep")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t("noStepsDefinedYet")}</p>
                </div>
              ) : (
                steps.map((step, index) => (
                  <Card key={step.id} className="border border-dashed">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <select
                              value={step.type}
                              onChange={(e) => updateStep(step.id, { type: e.target.value as Step['type'] })}
                              className="px-3 py-1 border rounded-md text-sm"
                            >
                              <option value="send_message">{t("sendMessage")}</option>
                              <option value="wait">{t("waitOption")}</option>
                              <option value="conditional">{t("conditionalOption")}</option>
                            </select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStep(step.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {step.type === 'send_message' && (
                            <div className="space-y-2">
                              <Label>{t("messageContent")}</Label>
                              <Textarea
                                value={step.content || ''}
                                onChange={(e) => updateStep(step.id, { content: e.target.value })}
                                placeholder={t("enterMessageToSend")}
                                rows={3}
                              />
                            </div>
                          )}
                          {(step.type === 'send_message' || step.type === 'wait') && (
                            <div className="space-y-2">
                              <Label>{t("delayMilliseconds")}</Label>
                              <Input
                                type="number"
                                value={step.delay || 0}
                                onChange={(e) => updateStep(step.id, { delay: parseInt(e.target.value) || 0 })}
                                placeholder={t("zeroPlaceholder")}
                              />
                            </div>
                          )}
                          {step.type === 'conditional' && (
                            <div className="space-y-2">
                              <Label>{t("conditionLabel")}</Label>
                              <Input
                                value={step.condition || ''}
                                onChange={(e) => updateStep(step.id, { condition: e.target.value })}
                                placeholder={t("enterConditionPlaceholder")}
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

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-2" />
                  {t("savingChanges")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t("createBotFlow")}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
