"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, Search, Copy, Star, MessageSquare, Clock, User, Calendar,
  DollarSign, CheckCircle, Zap, Workflow, Eye, Plus
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"

interface FlowTemplate {
  id: string
  name: string
  description: string
  category: string
  difficulty: 'Easy' | 'Medium' | 'Advanced'
  estimatedTime: string
  triggers: string[]
  actions: string[]
  preview: {
    trigger: any
    steps: any[]
  }
  tags: string[]
}

const flowTemplates: FlowTemplate[] = [
  {
    id: 'welcome_flow',
    name: 'Welcome Message Flow',
    description: 'Automatically greet new customers and provide helpful information',
    category: 'Customer Service',
    difficulty: 'Easy',
    estimatedTime: '5 minutes',
    triggers: ['new_contact'],
    actions: ['send_message', 'wait'],
    tags: ['welcome', 'automated', 'customer-service'],
    preview: {
      trigger: { type: 'trigger', name: 'New Contact', trigger: 'new_contact' },
      steps: [
        {
          type: 'send_message',
          content: 'مرحباً بك في متجرنا! كيف يمكننا مساعدتك اليوم؟',
          delay: 0
        },
        {
          type: 'wait',
          delay: 300000 // 5 minutes
        },
        {
          type: 'send_message',
          content: 'إذا كان لديك أي استفسار، نحن هنا للمساعدة 😊',
          delay: 0
        }
      ]
    }
  },
  {
    id: 'booking_reminder',
    name: 'Appointment Reminder',
    description: 'Send automated reminders before customer appointments',
    category: 'Scheduling',
    difficulty: 'Medium',
    estimatedTime: '10 minutes',
    triggers: ['booking_scheduled'],
    actions: ['wait', 'send_message'],
    tags: ['booking', 'reminder', 'automated'],
    preview: {
      trigger: { type: 'trigger', name: 'Booking Scheduled', trigger: 'booking_scheduled' },
      steps: [
        {
          type: 'wait',
          delay: 86400000 // 24 hours before
        },
        {
          type: 'send_message',
          content: 'تذكير: لديك حجز غداً في الساعة {{time}}. هل تريد تأكيد الحجز؟',
          delay: 0
        }
      ]
    }
  },
  {
    id: 'lead_qualification',
    name: 'Lead Qualification Flow',
    description: 'Automatically qualify new leads and route them appropriately',
    category: 'Sales',
    difficulty: 'Advanced',
    estimatedTime: '15 minutes',
    triggers: ['new_contact'],
    actions: ['send_message', 'wait', 'condition', 'assign_agent'],
    tags: ['sales', 'qualification', 'routing'],
    preview: {
      trigger: { type: 'trigger', name: 'New Contact', trigger: 'new_contact' },
      steps: [
        {
          type: 'send_message',
          content: 'مرحباً! أخبرنا عن احتياجاتك لنتمكن من تقديم أفضل خدمة لك',
          delay: 0
        },
        {
          type: 'wait',
          delay: 180000 // 3 minutes
        },
        {
          type: 'condition',
          condition: 'message_contains',
          field: 'message',
          operator: 'contains',
          value: 'عاجل|سريع|مهم',
          trueSteps: [
            { type: 'assign_agent', agentId: 'priority_agent' }
          ],
          falseSteps: [
            { type: 'send_message', content: 'شكراً لك. سنتصل بك قريباً' }
          ]
        }
      ]
    }
  },
  {
    id: 'payment_reminder',
    name: 'Payment Reminder Flow',
    description: 'Send automated payment reminders for overdue invoices',
    category: 'Finance',
    difficulty: 'Medium',
    estimatedTime: '8 minutes',
    triggers: ['invoice_due'],
    actions: ['wait', 'send_message'],
    tags: ['payment', 'reminder', 'finance'],
    preview: {
      trigger: { type: 'trigger', name: 'Invoice Due', trigger: 'invoice_due' },
      steps: [
        {
          type: 'wait',
          delay: 259200000 // 3 days before due date
        },
        {
          type: 'send_message',
          content: 'تذكير: فاتورة رقم {{invoice_id}} مستحقة بقيمة {{amount}} ريال',
          delay: 0
        },
        {
          type: 'wait',
          delay: 86400000 // Wait 1 day
        },
        {
          type: 'send_message',
          content: 'لم يتم استلام الدفعة بعد. يرجى السداد لتجنب إيقاف الخدمة',
          delay: 0
        }
      ]
    }
  },
  {
    id: 'feedback_collection',
    name: 'Post-Service Feedback',
    description: 'Collect customer feedback after service completion',
    category: 'Customer Service',
    difficulty: 'Easy',
    estimatedTime: '7 minutes',
    triggers: ['service_completed'],
    actions: ['wait', 'send_message', 'condition'],
    tags: ['feedback', 'survey', 'customer-service'],
    preview: {
      trigger: { type: 'trigger', name: 'Service Completed', trigger: 'service_completed' },
      steps: [
        {
          type: 'wait',
          delay: 3600000 // 1 hour after service
        },
        {
          type: 'send_message',
          content: 'كيف كانت تجربتك معنا؟ يرجى تقييم الخدمة من 1-5 نجوم ⭐',
          delay: 0
        },
        {
          type: 'condition',
          condition: 'rating_higher_than',
          field: 'rating',
          operator: 'greater_than',
          value: '3',
          trueSteps: [
            { type: 'send_message', content: 'شكراً لتقييمك الإيجابي! نتطلع لرؤيتك مرة أخرى 😊' }
          ],
          falseSteps: [
            { type: 'send_message', content: 'شكراً لملاحظاتك. سنعمل على تحسين خدماتنا' }
          ]
        }
      ]
    }
  },
  {
    id: 'business_hours_response',
    name: 'Business Hours Auto-Reply',
    description: 'Send automated responses outside business hours',
    category: 'Customer Service',
    difficulty: 'Medium',
    estimatedTime: '10 minutes',
    triggers: ['new_message'],
    actions: ['condition', 'send_message'],
    tags: ['business-hours', 'auto-reply', 'customer-service'],
    preview: {
      trigger: { type: 'trigger', name: 'New Message', trigger: 'new_message' },
      steps: [
        {
          type: 'condition',
          condition: 'time_check',
          timeRange: 'outside_business_hours',
          trueSteps: [
            {
              type: 'send_message',
              content: 'شكراً لتواصلك معنا! نحن خارج ساعات العمل حالياً. سنرد عليك في أول فرصة غداً صباحاً 🌅',
              delay: 0
            }
          ],
          falseSteps: [
            {
              type: 'send_message',
              content: 'مرحباً! كيف يمكننا مساعدتك؟',
              delay: 0
            }
          ]
        }
      ]
    }
  }
]

export default function FlowTemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const filteredTemplates = flowTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...Array.from(new Set(flowTemplates.map(t => t.category)))]

  const useTemplate = async (template: FlowTemplate) => {
    try {
      // Create flow from template
      const flowData = {
        name: template.name,
        description: template.description,
        trigger: template.preview.trigger.trigger,
        steps: template.preview.steps,
        isActive: false // Let user activate it manually
      }

      const response = await fetch('/api/bot-flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowData)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Template Applied",
          description: `Flow "${template.name}" created successfully. You can now edit and activate it.`,
        })
        router.push('/bot-flows')
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error creating flow from template:', error)
      toast({
        title: "Error",
        description: "Failed to create flow from template",
        variant: "destructive"
      })
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700'
      case 'Medium': return 'bg-yellow-100 text-yellow-700'
      case 'Advanced': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <AppLayout title={t("flowTemplates")}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t("flowTemplatesTitle")}</h1>
              <p className="text-muted-foreground">{t("choosePrebuiltTemplates")}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>

        {/* Templates Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {template.description}
                    </CardDescription>
                  </div>
                  <Badge className={getDifficultyColor(template.difficulty)}>
                    {template.difficulty}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Metadata */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {template.estimatedTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Workflow className="h-3 w-3" />
                    {template.actions.length} actions
                  </span>
                </div>

                {/* Triggers & Actions */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Triggers:</span>
                    {template.triggers.map(trigger => (
                      <Badge key={trigger} variant="outline" className="text-xs">
                        {trigger}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Actions:</span>
                    {template.actions.map(action => (
                      <Badge key={action} variant="secondary" className="text-xs">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {template.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(`/bot-flows/builder?template=${template.id}`)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => useTemplate(template)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <Workflow className="h-16 w-16 mx-auto opacity-50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">{t("noFlowTemplatesFound")}</h3>
            <p className="text-sm text-muted-foreground">{t("tryAdjustingSearch")}</p>
          </div>
        )}

        {/* Custom Flow CTA */}
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <Zap className="h-12 w-12 mx-auto opacity-50 mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">{t("needCustomFlow")}</h3>
            <p className="text-muted-foreground mb-4">
              Create a completely custom automation flow using our visual builder
            </p>
            <Button onClick={() => router.push('/bot-flows/builder')}>
              <Plus className="h-4 w-4 mr-2" />
              Build Custom Flow
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}