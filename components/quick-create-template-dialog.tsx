"use client"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { authenticatedFetch } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

const AVAILABLE_VARIABLES = ['name', 'phone', 'email', 'company_name', 'order_id', 'date']

interface QuickCreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function QuickCreateTemplateDialog({ open, onOpenChange, onSuccess }: QuickCreateTemplateDialogProps) {
  const { toast } = useToast()
  const { t } = useI18n()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: "",
    content: "",
    category: "",
    language: "en",
    whatsappAccountId: "",
    triggerKeywords: "",
  })
  const [whatsappAccounts, setWhatsappAccounts] = useState<{ id: string; name: string; phone: string }[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    authenticatedFetch('/api/whatsapp/accounts')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.accounts) setWhatsappAccounts(data.accounts)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name?.trim() || !form.content?.trim() || !form.category?.trim()) {
      toast({
        title: t("validationError"),
        description: t("nameContentCategoryRequired"),
        variant: "destructive",
      })
      return
    }
    try {
      setIsSubmitting(true)
      const payload = {
        ...form,
        whatsappAccountId: form.whatsappAccountId || undefined,
        triggerKeywords: form.triggerKeywords
          ? form.triggerKeywords.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      }
      const response = await authenticatedFetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: t("success"), description: t("templateCreatedSuccess") })
        setForm({ name: "", content: "", category: "", language: "en", whatsappAccountId: "", triggerKeywords: "" })
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast({
          title: t("error"),
          description: data.error || t("failedToCreateTemplate"),
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: t("error"),
        description: t("failedToConnectToServer"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInsertVariable = (variable: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = form.content
    const insert = `{{${variable}}}`
    const newContent = text.slice(0, start) + insert + text.slice(end)
    setForm((f) => ({ ...f, content: newContent }))
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + insert.length, start + insert.length)
    }, 0)
  }

  const handleClose = (open: boolean) => {
    if (!open) setForm({ name: "", content: "", category: "", language: "en", whatsappAccountId: "", triggerKeywords: "" })
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("createMessageTemplate")}</DialogTitle>
          <DialogDescription>{t("createReusableTemplate")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="qc-tpl-name">{t("templateName")} *</Label>
              <Input
                id="qc-tpl-name"
                placeholder={t("templateNamePlaceholder")}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("whatsappAccounts")} ({t("quickReplyScope")})</Label>
              <Select
                value={form.whatsappAccountId || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, whatsappAccountId: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectWhatsAppNumber")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noScope")}</SelectItem>
                  {whatsappAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name || acc.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("templateShownOnlyForThisNumber")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-tpl-trigger">{t("triggerKeywords")}</Label>
              <Input
                id="qc-tpl-trigger"
                placeholder="Hi, Hello, مرحبا"
                value={form.triggerKeywords}
                onChange={(e) => setForm((f) => ({ ...f, triggerKeywords: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{t("triggerKeywordsHint")}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qc-tpl-category">{t("categoryRequired")}</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger id="qc-tpl-category">
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding">{t("categoryOnboarding")}</SelectItem>
                    <SelectItem value="sales">{t("categorySales")}</SelectItem>
                    <SelectItem value="support">{t("categorySupport")}</SelectItem>
                    <SelectItem value="marketing">{t("categoryMarketing")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qc-tpl-language">{t("languageLabel")}</Label>
                <Select
                  value={form.language}
                  onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
                >
                  <SelectTrigger id="qc-tpl-language">
                    <SelectValue placeholder={t("selectLanguage")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t("languageEnglish")}</SelectItem>
                    <SelectItem value="ar">{t("languageArabic")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-tpl-content">{t("messageContent")} *</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {AVAILABLE_VARIABLES.map((v) => (
                  <Badge
                    key={v}
                    variant="outline"
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => handleInsertVariable(v)}
                  >
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
              <Textarea
                id="qc-tpl-content"
                ref={textareaRef}
                placeholder={t("templateContentPlaceholder")}
                className="min-h-32"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("savingChanges") : t("createTemplate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
