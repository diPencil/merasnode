// User and Role Types
export type UserRole = "admin" | "agent" | "supervisor" | "viewer"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  status: "online" | "offline" | "away"
  createdAt: Date
}

// Contact Types
export interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  avatar?: string
  tags: string[]
  notes?: string
  followUpDate?: Date
  customFields?: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

// Conversation and Message Types
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed"
export type MessageType = "text" | "image" | "document" | "audio" | "video"

export interface Message {
  id: string
  conversationId: string
  content: string
  type: MessageType
  direction: "inbound" | "outbound"
  status: MessageStatus
  timestamp: Date
  attachments?: Array<{
    id: string
    type: string
    url: string
    name: string
    size: number
  }>
}

export interface Conversation {
  id: string
  contactId: string
  contact: Contact
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  status: "active" | "archived" | "blocked"
  assignedTo?: string
  assignedAgent?: User
  tags: string[]
  messages: Message[]
}

// Template Types
export interface Template {
  id: string
  name: string
  category: string
  language: "en" | "ar"
  content: string
  variables: string[]
  status: "approved" | "pending" | "rejected"
  createdAt: Date
  updatedAt: Date
}

// Bot Flow Types
export interface BotFlow {
  id: string
  name: string
  description: string
  trigger: string
  status: "active" | "inactive"
  isActive: boolean
  steps: any[]
  createdAt: Date
  updatedAt: Date
}

// WhatsApp Account Types
export type AccountProvider = "meta-cloud" | "whatsapp-web"
export type AccountStatus = "connected" | "disconnected" | "waiting" | "error"

export interface WhatsAppAccount {
  id: string
  name: string
  phone: string
  provider: AccountProvider
  status: AccountStatus
  // Meta Cloud API fields
  phoneNumberId?: string
  businessAccountId?: string
  accessToken?: string
  webhookVerifyToken?: string
  webhookUrl?: string
  // WhatsApp Web fields
  qrCode?: string
  qrExpiry?: Date
  createdAt: Date
  updatedAt: Date
}

// Activity Log Types
export interface ActivityLog {
  id: string
  userId: string
  user: User
  action: string
  resource: string
  details: string
  timestamp: Date
  ipAddress?: string
}
