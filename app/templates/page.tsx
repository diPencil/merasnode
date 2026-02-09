"use client"

import { useState, useEffect, useRef } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { Search, Plus, CheckCircle2, Clock, XCircle } from "lucide-react"

interface Template {
  id: string
  name: string
  content: string
  category: string
  language: string
  status: string
  variables: string[]
  createdAt: string
}

const AVAILABLE_VARIABLES = ['name', 'phone', 'email', 'company_name', 'order_id', 'date']

export default function TemplatesPage() {
  const { toast } = useToast()
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    content: "",
    category: "",
    language: "en"
  })

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/templates')
      const data = await response.json()

      if (data.success) {
        setTemplates(data.data)
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newTemplate.name || !newTemplate.content || !newTemplate.category) {
      toast({
        title: t("validationError"),
        description: t("nameContentCategoryRequired"),
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)

      const url = editingId ? `/api/templates/${editingId}` : '/api/templates'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      })

      const data = await response.json()

      if (data.success) {
        if (editingId) {
          setTemplates(templates.map(t => t.id === editingId ? data.data : t))
          toast({
            title: t("success"),
            description: t("templateUpdatedSuccess")
          })
        } else {
          setTemplates([...templates, data.data])
          toast({
            title: t("success"),
            description: t("templateCreatedSuccess")
          })
        }
        setIsCreateOpen(false)
        setNewTemplate({ name: "", content: "", category: "", language: "en" })
        setEditingId(null)
      } else {
        toast({
          title: t("error"),
          description: data.error || t("failedToCreateTemplate"),
          variant: "destructive"
        })
      }
    } catch (err) {
      toast({
        title: t("error"),
        description: t("failedToConnectToServer"),
        variant: "destructive"
      })
      console.error('Error creating template:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInsertVariable = (variable: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = newTemplate.content
    const variableText = `{{${variable}}}`

    const newContent = text.substring(0, start) + variableText + text.substring(end)
    setNewTemplate({ ...newTemplate, content: newContent })

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variableText.length, start + variableText.length)
    }, 0)
  }

  const handleStartEdit = (template: Template) => {
    setEditingId(template.id)
    setNewTemplate({
      name: template.name,
      content: template.content,
      category: template.category,
      language: template.language
    })
    setIsCreateOpen(true)
  }

  const handleUse = (template: Template) => {
    navigator.clipboard.writeText(template.content)
    toast({
      title: t("templateCopied"),
      description: t("templateContentCopied"),
    })
  }

  const filteredTemplates = templates.filter((template) => {
    const query = searchQuery.toLowerCase()
    return (
      template.name.toLowerCase().includes(query) ||
      template.category.toLowerCase().includes(query) ||
      template.content.toLowerCase().includes(query)
    )
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />
    }
  }

  return (
    <AppLayout title={t("templates")}>
      <div className="space-y-6">
        {/* Header Actions */}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">{t("messageTemplates")}</h2>
            <Badge variant="outline" className="text-sm px-2.5 py-0.5 h-7">
              {t("total")}: {filteredTemplates.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9">
                  <Plus className="me-2 h-4 w-4" />
                  {t("createTemplate")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? t("editMessageTemplate") : t("createMessageTemplate")}</DialogTitle>
                  <DialogDescription>{editingId ? t("updateExistingTemplate") : t("createReusableTemplate")}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTemplate}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("templateName")} *</Label>
                      <Input
                        id="name"
                        placeholder={t("templateNamePlaceholder")}
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">{t("categoryRequired")}</Label>
                        <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}>
                          <SelectTrigger id="category">
                            <SelectValue placeholder={t("selectCategory")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="onboarding">Onboarding</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="language">{t("languageLabel")}</Label>
                        <Select value={newTemplate.language} onValueChange={(value) => setNewTemplate({ ...newTemplate, language: value })}>
                          <SelectTrigger id="language">
                            <SelectValue placeholder={t("selectLanguage")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="ar">Arabic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">{t("messageContent")} *</Label>
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
                        id="content"
                        ref={textareaRef}
                        placeholder={t("templateContentPlaceholder")}
                        className="min-h-32"
                        value={newTemplate.content}
                        onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Use {`{{variable}}`} for dynamic content. Example: {`{{name}}`}, {`{{order_id}}`}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setEditingId(null); setNewTemplate({ name: "", content: "", category: "", language: "en" }) }}>
                      {t("cancel")}
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? t("savingChanges") : (editingId ? t("updateTemplate") : t("createTemplate"))}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 text-sm text-muted-foreground">{t("loadingTemplates")}</p>
            </div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("noTemplatesFound")}</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="rounded-2xl shadow-soft">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.category}</CardDescription>
                    </div>
                    {getStatusIcon(template.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{template.content}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="rounded-full">
                        {template.language}
                      </Badge>
                      <Badge variant={template.status === "approved" ? "default" : "secondary"} className="rounded-full">
                        {template.status}
                      </Badge>
                    </div>
                  </div>

                  {template.variables && template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="secondary" className="rounded-full text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1 rounded-full" onClick={() => handleUse(template)}>
                      Use
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 rounded-full bg-transparent" onClick={() => handleStartEdit(template)}>
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout >
  )
}
