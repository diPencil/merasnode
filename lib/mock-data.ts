import type { User, Contact, Conversation, Message, Template, BotFlow, WhatsAppAccount, ActivityLog } from "./types"

// Mock Users
export const mockUsers: User[] = []

// Mock Contacts
export const mockContacts: Contact[] = []

// Mock Messages
const generateMockMessages = (conversationId: string): Message[] => {
  const baseMessages: Omit<Message, "conversationId">[] = [
    {
      id: "1",
      content: "Hello, I need help with my order",
      type: "text",
      direction: "inbound",
      status: "read",
      timestamp: new Date("2024-12-17T09:00:00"),
    },
    {
      id: "2",
      content: "Hi! I'd be happy to help. Could you please provide your order number?",
      type: "text",
      direction: "outbound",
      status: "read",
      timestamp: new Date("2024-12-17T09:01:00"),
    },
    {
      id: "3",
      content: "Sure, it's #ORD-12345",
      type: "text",
      direction: "inbound",
      status: "read",
      timestamp: new Date("2024-12-17T09:02:00"),
    },
    {
      id: "4",
      content: "Thank you! Let me check the status for you.",
      type: "text",
      direction: "outbound",
      status: "delivered",
      timestamp: new Date("2024-12-17T09:03:00"),
    },
  ]

  return baseMessages.map((msg) => ({ ...msg, conversationId }))
}

// Mock Conversations
export const mockConversations: Conversation[] = []

// Mock Templates
export const mockTemplates: Template[] = []

// Mock Bot Flows
export const mockBotFlows: BotFlow[] = [
  {
    id: "1",
    name: "Welcome Message Flow",
    description: "Automated welcome message for new contacts",
    trigger: "New Contact",
    steps: [
      {
        id: "1",
        type: "send_message",
        content: "مرحباً بك في مراس! كيف يمكننا مساعدتك اليوم؟",
        delay: 0
      },
      {
        id: "2",
        type: "wait_for_response",
        timeout: 300000 // 5 minutes
      },
      {
        id: "3",
        type: "send_message",
        content: "إذا كان لديك أي استفسار، نحن هنا لمساعدتك!",
        delay: 300000
      }
    ],
    isActive: true,
    createdAt: new Date("2026-01-20T10:00:00Z"),
    updatedAt: new Date("2026-01-22T15:30:00Z")
  },
  {
    id: "2",
    name: "Booking Reminder Flow",
    description: "Send reminders before appointments",
    trigger: "Booking Scheduled",
    steps: [
      {
        id: "1",
        type: "wait",
        delay: 86400000 // 24 hours before
      },
      {
        id: "2",
        type: "send_message",
        content: "تذكير: لديك حجز غداً في الساعة {{appointment_time}}. هل تريد تأكيد الحجز؟",
        delay: 0
      }
    ],
    isActive: true,
    createdAt: new Date("2026-01-21T08:00:00Z"),
    updatedAt: new Date("2026-01-22T14:00:00Z")
  },
  {
    id: "3",
    name: "Follow-up Flow",
    description: "Follow up with customers after service completion",
    trigger: "Service Completed",
    steps: [
      {
        id: "1",
        type: "wait",
        delay: 86400000 // 24 hours after
      },
      {
        id: "2",
        type: "send_message",
        content: "كيف كانت تجربتك معنا؟ يرجى تقييم الخدمة من 1-5 نجوم",
        delay: 0
      },
      {
        id: "3",
        type: "wait_for_response",
        timeout: 180000 // 3 minutes
      },
      {
        id: "4",
        type: "conditional",
        condition: "rating >= 4",
        trueSteps: [
          {
            id: "5",
            type: "send_message",
            content: "شكراً لتقييمك الإيجابي! نتطلع لرؤيتك مرة أخرى 😊",
            delay: 0
          }
        ],
        falseSteps: [
          {
            id: "6",
            type: "send_message",
            content: "شكراً لملاحظاتك. سنعمل على تحسين خدماتنا. هل يمكننا الاتصال بك؟",
            delay: 0
          }
        ]
      }
    ],
    isActive: false,
    createdAt: new Date("2026-01-19T12:00:00Z"),
    updatedAt: new Date("2026-01-22T13:00:00Z")
  },
  {
    id: "4",
    name: "Payment Reminder Flow",
    description: "Remind customers about pending payments",
    trigger: "Invoice Due",
    steps: [
      {
        id: "1",
        type: "wait",
        delay: 259200000 // 3 days before due date
      },
      {
        id: "2",
        type: "send_message",
        content: "تذكير: فاتورة رقم {{invoice_number}} مستحقة بقيمة {{amount}} ريال. يرجى السداد قبل {{due_date}}",
        delay: 0
      },
      {
        id: "3",
        type: "wait",
        delay: 86400000 // Wait 1 day
      },
      {
        id: "4",
        type: "send_message",
        content: "لم يتم استلام الدفعة بعد. يرجى السداد لتجنب إيقاف الخدمة.",
        delay: 0
      }
    ],
    isActive: true,
    createdAt: new Date("2026-01-18T09:00:00Z"),
    updatedAt: new Date("2026-01-22T12:00:00Z")
  },
  {
    id: "5",
    name: "Lead Qualification Flow",
    description: "Qualify new leads automatically",
    trigger: "New Lead",
    steps: [
      {
        id: "1",
        type: "send_message",
        content: "مرحباً! أخبرنا عن احتياجاتك لنتمكن من تقديم أفضل خدمة لك",
        delay: 0
      },
      {
        id: "2",
        type: "wait_for_response",
        timeout: 300000 // 5 minutes
      },
      {
        id: "3",
        type: "send_message",
        content: "متى تفضل جدولة موعد؟ اليوم، غداً، أو في وقت آخر؟",
        delay: 0
      },
      {
        id: "4",
        type: "wait_for_response",
        timeout: 180000 // 3 minutes
      },
      {
        id: "5",
        type: "tag_contact",
        tags: ["qualified", "interested"],
        delay: 0
      },
      {
        id: "6",
        type: "notify_agent",
        message: "عميل مؤهل جديد: {{contact_name}} - {{contact_phone}}",
        delay: 0
      }
    ],
    isActive: true,
    createdAt: new Date("2026-01-17T14:00:00Z"),
    updatedAt: new Date("2026-01-22T11:00:00Z")
  }
]

// Mock WhatsApp Accounts
export const mockWhatsAppAccounts: WhatsAppAccount[] = []

// Mock Activity Logs
export const mockActivityLogs: ActivityLog[] = []
