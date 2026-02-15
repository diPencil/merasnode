"use client"

import { useState, useEffect, useRef, useMemo, type ReactNode } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search, Send, Phone, Video, MoreVertical, Paperclip, Smile,
  MapPin, Mic, Filter, Check, X, Calendar, User, Facebook, Instagram,
  MessageCircle, Sparkles, Play, Building2, StickyNote, Tag, CheckCheck, ExternalLink,
  Reply, Forward
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { format, formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { getUserRole, getUser, authenticatedFetch, getAuthHeader } from "@/lib/auth"
import { Sidebar } from "./Sidebar"
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { SidebarContent } from "./sidebar-content"
import { ArrowLeft, Info } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Message {
  id: string
  content: string
  direction: "INCOMING" | "OUTGOING"
  status: "SENT" | "DELIVERED" | "READ" | "FAILED"
  createdAt: string
  type?: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "LOCATION"
  mediaUrl?: string
  whatsappAccountId?: string | null
  metadata?: { forwarded?: boolean; [k: string]: unknown }
  quotedMessage?: Message | null
  quotedMessageId?: string | null
  sender?: {
    id: string
    name: string | null
    email: string | null
    username?: string | null
  } | null
}


interface Conversation {
  id: string
  contactId: string
  status: "ACTIVE" | "RESOLVED" | "PENDING"
  lastMessageAt: string
  isRead: boolean
  isBlocked: boolean // Added isBlocked
  contact: {
    id: string
    name: string
    phone: string
    externalId?: string
    email?: string // Added email for updates
    tags?: any // Added tags for block logic
    notes?: string
  }
  messages: Message[]
  // Mock fields for UI
  platform?: 'whatsapp' | 'facebook' | 'instagram'
  leadScore?: 'Hot' | 'Warm' | 'Cold'
  leadStatus?: 'New' | 'Booked' | 'In Progress'
  branch?: string
}

// ... existing code ...



const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Branch {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  isActive: boolean
}

// Bot Flow Interface
interface BotFlow {
  id: string
  name: string
  trigger: string
  isActive: boolean
}

export default function InboxPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBranch, setSelectedBranch] = useState("all")
  const [filterType, setFilterType] = useState<"all" | "unread" | "groups">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [bookingAgents, setBookingAgents] = useState<{ id: string; name: string; role: string }[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [botFlows, setBotFlows] = useState<BotFlow[]>([])
  const [suggestedFlow, setSuggestedFlow] = useState<BotFlow | null>(null)
  const [isSuggestionSnoozed, setIsSuggestionSnoozed] = useState(false)
  const [quickReplyTemplates, setQuickReplyTemplates] = useState<{ id: string; name: string; content: string }[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [lastOrderId, setLastOrderId] = useState<string>("N/A")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null)
  const [forwardTargetConversation, setForwardTargetConversation] = useState<Conversation | null>(null)
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false)
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const { toast } = useToast()
  const { t, language, dir } = useI18n()
  const dateLocale = language === "ar" ? ar : undefined
  const isMobile = useIsMobile()

  // ... existing refs ...
  const searchParams = useSearchParams()
  const conversationIdParam = searchParams.get('id')
  const phoneParam = searchParams.get('phone')
  const normalizePhone = (p: string) => (p || '').replace(/\D/g, '')

  // Recording Refs
  const [isRecording, setIsRecording] = useState(false)
  const [failedVideoIds, setFailedVideoIds] = useState<Set<string>>(new Set())
  // Use app base URL for media so images work after deploy and when opening from different origin (e.g. localhost)
  const baseUrl =
    (typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || window.location.origin)
      : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "")) || ""
  const getFullMediaUrl = (url: string | undefined) => {
    if (!url) return ""
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    return baseUrl ? `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}` : url
  }
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null)

  // Scroll chat to bottom when messages change (RTL: scroll position still "bottom" = end of content)
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, selectedConversation?.id])

  useEffect(() => {
    fetchUsers()
    fetchBranches()
    fetchBotFlows()
    fetchSettings()
    fetchBookingAgents()
  }, [])

  // Refetch conversations when branch filter changes (and on mount)
  useEffect(() => {
    fetchConversations()
  }, [selectedBranch])

  const fetchSettings = async () => {
    try {
      const response = await authenticatedFetch('/api/settings')
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const fetchLastOrderId = async (contactId: string) => {
    try {
      // Try fetching bookings first
      const response = await authenticatedFetch(`/api/bookings?contactId=${contactId}`)
      const data = await response.json()
      if (data.success && data.data && data.data.length > 0) {
        // Find latest booking for THIS contact (API might return all, filter just in case)
        const contactBookings = data.data.filter((b: any) => b.contactId === contactId)
        if (contactBookings.length > 0) {
          setLastOrderId(contactBookings[0].bookingNumber)
          return
        }
      }
      setLastOrderId("N/A")
    } catch (error) {
      console.error('Error fetching last order ID:', error)
      setLastOrderId("N/A")
    }
  }

  useEffect(() => {
    if (selectedConversation) {
      setMessages([]) // Clear previous messages
      setSuggestedFlow(null) // Clear previous suggestions
      setIsSuggestionSnoozed(false) // Reset snooze
      setLastOrderId("N/A") // Reset last order ID
      fetchMessages(selectedConversation.id)
      fetchBotFlows() // Refresh flows to ensure new triggers are loaded
      fetchLastOrderId(selectedConversation.contactId)
    } else {
      setMessages([])
      setSuggestedFlow(null)
      setLastOrderId("N/A")
    }
  }, [selectedConversation])

  // Analyze messages for bot flow triggers
  useEffect(() => {
    console.log("Analyzing match:", { messagesCount: messages.length, botFlowsCount: botFlows.length })
    if (!botFlows.length) {
      setSuggestedFlow(null)
      return
    }

    // Only suggest for incoming messages or if we want to debug easily
    // strict logic: check if last message content contains any active flow trigger
    // Suggest if ANY of the last 3 messages contains a trigger (prioritizing most recent)
    const recentMessages = messages.slice(-3).reverse()
    console.log("Recent messages to check:", recentMessages.map(m => m.content))

    let match: BotFlow | undefined

    for (const msg of recentMessages) {
      const text = msg.content.toLowerCase()
      match = botFlows.find(flow => {
        const isMatch = flow.isActive &&
          flow.trigger &&
          text.includes(flow.trigger.toLowerCase());
        if (isMatch) console.log("Match found!", { flowName: flow.name, trigger: flow.trigger });
        return isMatch;
      })
      if (match) break
    }

    if (match) {
      setSuggestedFlow(match)
    } else {
      setSuggestedFlow(null)
    }
  }, [messages, botFlows])

  // Quick-reply templates (WhatsApp/Facebook style): show when last customer message matches trigger keywords
  useEffect(() => {
    if (!selectedConversation || !messages.length) {
      setQuickReplyTemplates([])
      return
    }
    const lastIncoming = [...messages].reverse().find((m) => m.direction === "INCOMING" && m.content?.trim() && (m.type === "TEXT" || !m.type))
    const triggerText = lastIncoming?.content?.trim()
    if (!triggerText) {
      setQuickReplyTemplates([])
      return
    }
    const waId = lastIncoming?.whatsappAccountId ?? (messages.find((m) => m.whatsappAccountId)?.whatsappAccountId)
    if (!waId) {
      setQuickReplyTemplates([])
      return
    }
    const url = `/api/templates?whatsappAccountId=${encodeURIComponent(waId)}&trigger=${encodeURIComponent(triggerText)}`
    authenticatedFetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setQuickReplyTemplates(data.data.map((t: any) => ({ id: t.id, name: t.name, content: t.content })))
        } else {
          setQuickReplyTemplates([])
        }
      })
      .catch(() => setQuickReplyTemplates([]))
  }, [selectedConversation?.id, messages])

  const fetchBotFlows = async () => {
    try {
      const response = await authenticatedFetch('/api/bot-flows')
      const data = await response.json()
      if (data.success) {
        setBotFlows(data.data)
      }
    } catch (error) {
      console.error('Error fetching bot flows:', error)
    }
  }

  const handleAcceptSuggestion = async (flow: BotFlow) => {
    if (!selectedConversation) return

    // 1. Send automated message starting the flow
    await handleSendMessage(`🤖 Starting automated flow: ${flow.name}...`)

    // 2. Track Interaction
    try {
      await authenticatedFetch('/api/bot-flows/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowId: flow.id,
          contactId: selectedConversation.contactId,
          action: 'TRIGGERED',
          stepIndex: 0,
          metadata: { source: 'ai_suggestion' }
        })
      })
    } catch (error) {
      console.error('Error tracking flow:', error)
    }

    // 3. Clear suggestion
    toast({
      title: t("flowStarted"),
      description: `${flow.name} – ${t("flowStartedDesc")}`,
    })

    setSuggestedFlow(null)
  }

  const handleDismissSuggestion = () => {
    setIsSuggestionSnoozed(true)
    setTimeout(() => {
      setIsSuggestionSnoozed(false)
    }, 10000) // Reappear after 10 seconds
  }

  // Polling for Conversations List (every 5 seconds); respects branch filter
  useEffect(() => {
    const url = selectedBranch && selectedBranch !== 'all'
      ? `/api/conversations?branchId=${encodeURIComponent(selectedBranch)}`
      : '/api/conversations'
    const interval = setInterval(() => {
      authenticatedFetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.conversations) {
            const enrichedConversations = data.conversations.map((c: any, index: number) => ({
              ...c,
              platform: 'whatsapp',
              leadScore: index === 0 ? 'Hot' : 'Warm',
              leadStatus: index === 0 ? 'New' : index === 1 ? 'Booked' : 'In Progress',
              branch: c.contact?.branch ?? null,
            }))
            setConversations(prev => {
              // Deduplicate incoming conversations based on ID
              const uniqueEnriched = Array.from(new Map(enrichedConversations.map((c: any) => [c.id, c])).values()) as Conversation[];

              if (JSON.stringify(prev) === JSON.stringify(uniqueEnriched)) return prev
              return uniqueEnriched
            })
          }
        })
        .catch(err => console.error('Polling convos error:', err))
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedBranch])

  // Polling for Active Conversation Messages (every 3s — smooth + always show latest full content)
  useEffect(() => {
    if (!selectedConversation) return;

    const interval = setInterval(() => {
      authenticatedFetch(`/api/messages?conversationId=${selectedConversation.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.messages) {
            setMessages(data.messages);
          }
        })
        .catch(err => console.error('Polling messages error:', err));
    }, 3000); // 3s for smoother updates and full message content
    return () => clearInterval(interval);
  }, [selectedConversation?.id]);

  const fetchUsers = async () => {
    try {
      const response = await authenticatedFetch('/api/users')
      const data = await response.json()
      if (data.success) {
        setUsers(data.data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchBookingAgents = async () => {
    try {
      const response = await authenticatedFetch('/api/users/agents')
      const data = await response.json()
      if (data.success && Array.isArray(data.data)) {
        setBookingAgents(data.data)
      }
    } catch (error) {
      console.error('Error fetching booking agents:', error)
    }
  }

  const fetchBranches = async () => {
    try {
      const userRole = getUserRole()
      const currentUser = getUser()

      // Backend now returns only branches the user has access to (role-scoped)
      const response = await authenticatedFetch('/api/branches')
      const data = await response.json()
      if (data.success) {
        const filteredBranches = data.branches.filter((b: Branch) => b.isActive)
        setBranches(filteredBranches)
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
    }
  }

  const fetchConversations = async () => {
    try {
      setIsLoading(true)
      const url = selectedBranch && selectedBranch !== 'all'
        ? `/api/conversations?branchId=${encodeURIComponent(selectedBranch)}`
        : '/api/conversations'
      const response = await authenticatedFetch(url)
      const data = await response.json()

      if (data.success && data.conversations) {
        // Enriched mock data for UI demo purposes
        const enrichedConversations = await Promise.all(data.conversations.map(async (c: any, index: number) => ({
          ...c,
          platform: 'whatsapp',
          leadScore: index === 0 ? 'Hot' : 'Warm',
          leadStatus: index === 0 ? 'New' : index === 1 ? 'Booked' : 'In Progress',
          branch: c.contact?.branch ?? null,
        })))

        // Deduplicate conversations based on ID to fix repeat issue
        const uniqueConversations = Array.from(new Map(enrichedConversations.map((c: any) => [c.id, c])).values()) as Conversation[];

        setConversations(uniqueConversations)

        // Selection logic:
        // - If URL has ?id=... → open that conversation explicitly
        // - If URL has ?phone=... → open conversation with that contact phone (e.g. from WhatsApp Accounts "Manage")
        // - Otherwise → do NOT auto-select any conversation
        if (conversationIdParam) {
          const target = enrichedConversations.find(
            (c: Conversation) => c.id === conversationIdParam,
          )
          setSelectedConversation(target ?? null)
        } else if (phoneParam) {
          const normalized = normalizePhone(phoneParam)
          const target = enrichedConversations.find(
            (c: Conversation) => normalizePhone(c.contact?.phone ?? '') === normalized || c.contact?.phone?.includes(normalized) || normalized.includes(normalizePhone(c.contact?.phone ?? '')),
          )
          setSelectedConversation(target ?? null)
        } else {
          setSelectedConversation(null)
        }
      } else {
        setConversations([])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await authenticatedFetch(`/api/messages?conversationId=${conversationId}`)
      const data = await response.json()

      if (data.success) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  type SendMessageOptions = { replyToId?: string; forwarded?: boolean; type?: string; targetConversationId?: string }

  const handleSendMessage = async (text?: string, mediaUrl?: string, options?: SendMessageOptions) => {
    const contentToSend = text !== undefined ? text : newMessage;
    const targetConv = options?.targetConversationId
      ? conversations.find(c => c.id === options.targetConversationId)
      : selectedConversation;
    if ((!contentToSend.trim() && !mediaUrl) || !targetConv) return

    const opts: SendMessageOptions = { ...options }
    if (replyingTo && !opts.replyToId) opts.replyToId = replyingTo.id

    try {
      setIsSending(true)

      let whatsappAccountId = (targetConv as any).whatsappAccountId || null
      if (!whatsappAccountId && messages.length > 0) {
        const messageWithAccount = [...messages].reverse().find(m => m.whatsappAccountId)
        if (messageWithAccount) whatsappAccountId = messageWithAccount.whatsappAccountId
      }
      if (!whatsappAccountId) {
        try {
          const accountsRes = await authenticatedFetch('/api/whatsapp/accounts')
          const accountsData = await accountsRes.json()
          if (accountsData.success && accountsData.accounts?.length > 0) {
            const connectedAccount = accountsData.accounts.find((acc: any) => acc.status === 'CONNECTED')
            if (connectedAccount) whatsappAccountId = connectedAccount.id
          }
        } catch (err) {
          console.error('Error fetching WhatsApp accounts:', err)
        }
      }

      const payload: Record<string, unknown> = {
        conversationId: targetConv.id,
        content: contentToSend,
        direction: 'OUTGOING',
        mediaUrl: mediaUrl ?? undefined,
        whatsappAccountId: whatsappAccountId ?? undefined,
      }
      if (opts.replyToId) payload.replyToId = opts.replyToId
      if (opts.forwarded) payload.forwarded = true
      if (opts.type) payload.type = opts.type

      const response = await authenticatedFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        if (!mediaUrl) setNewMessage("")
        setReplyingTo(null)
        setQuickReplyTemplates([])
        if (opts.targetConversationId) {
          setForwardMessage(null)
          setForwardTargetConversation(null)
          fetchMessages(opts.targetConversationId)
        } else {
          fetchMessages(selectedConversation!.id)
        }
        setConversations(prev => prev.map(c =>
          c.id === targetConv.id
            ? { ...c, lastMessageAt: new Date().toISOString() }
            : c
        ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()))
      } else {
        toast({ title: t("error"), description: data.error || t("failedToSendMessage"), variant: "destructive" })
      }
    } catch (error) {
      toast({ title: t("error"), description: t("failedToSendMessage"), variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  const handleLocationShare = () => {
    if (!navigator.geolocation) {
      toast({ title: t("error"), description: t("geolocationNotSupported"), variant: "destructive" });
      return;
    }

    toast({ title: t("gettingLocation"), description: t("pleaseAllowLocation") });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        handleSendMessage(mapLink, undefined, { type: 'LOCATION' });
      },
      (error) => {
        console.error("Location error:", error);
        let errorMsg = t("failedToGetLocation");
        if (error.code === 1) errorMsg = t("locationAccessDenied");
        toast({ title: t("error"), description: errorMsg, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }

  /* --- BOT FLOWS FEATURE --- */
  const [isBotFlowsDialogOpen, setIsBotFlowsDialogOpen] = useState(false)

  /* --- TEMPLATES FEATURE --- */
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])

  const fetchTemplates = async () => {
    try {
      const response = await authenticatedFetch('/api/templates?status=APPROVED')
      const data = await response.json()
      if (data.success) {
        setTemplates(data.data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const handleUseTemplate = (content: string) => {
    let finalContent = content
    const contact = selectedConversation?.contact

    if (contact) {
      // Basic Contact Info
      finalContent = finalContent.replace(/{{name}}/gi, contact.name || "")
      finalContent = finalContent.replace(/{{phone}}/gi, contact.phone || "")
      finalContent = finalContent.replace(/{{email}}/gi, contact.email || "")
    }

    // Company Settings
    if (settings?.companyName) {
      finalContent = finalContent.replace(/{{company_name}}/gi, settings.companyName)
    }

    // Order/Booking Info
    finalContent = finalContent.replace(/{{order_id}}/gi, lastOrderId || "N/A")

    // Date Info
    finalContent = finalContent.replace(/{{date}}/gi, format(new Date(), 'yyyy-MM-dd'))

    setNewMessage(finalContent)
    setIsTemplatesOpen(false)
  }

  useEffect(() => {
    if (isTemplatesOpen) {
      fetchTemplates()
    }
  }, [isTemplatesOpen])

  const handleResolve = async () => {
    if (!selectedConversation) return

    setIsLoading(true)
    try {
      const response = await authenticatedFetch(`/api/conversations/${selectedConversation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: t("conversationResolved"),
          description: t("conversationResolvedDesc"),
        })
        fetchConversations()
        // After resolving, return to the inbox list.
        setSelectedConversation(null)
        router.push("/inbox")
      } else {
        throw new Error(data.error || 'Failed')
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToResolveConversation"),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportChat = () => {
    if (!selectedConversation || messages.length === 0) {
      toast({
        title: t("exportFailed"),
        description: t("noMessagesToExport"),
        variant: "destructive"
      })
      return
    }

    const exportData = messages.map(m =>
      `[${format(new Date(m.createdAt), 'yyyy-MM-dd HH:mm:ss')}] ${m.direction}: ${m.content}`
    ).join('\n')

    const blob = new Blob([exportData], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat_export_${selectedConversation.contact.name}_${format(new Date(), 'yyyyMMdd')}.txt`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast({ title: t("exported"), description: t("chatExportedSuccessfully") })
  }


  const handleBlockContact = () => {
    if (selectedConversation) setBlockConfirmOpen(true)
  }

  const confirmBlockContact = async () => {
    if (!selectedConversation) return
    try {
      setIsLoading(true)
      setBlockConfirmOpen(false)

      const currentTags = selectedConversation.contact.tags
        ? (Array.isArray(selectedConversation.contact.tags) ? selectedConversation.contact.tags : String(selectedConversation.contact.tags).split(','))
        : []
      if (!currentTags.includes('blocked')) {
        const updatedTags = [...currentTags, 'blocked']
        await authenticatedFetch(`/api/contacts/${selectedConversation.contactId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: selectedConversation.contact.name,
            phone: selectedConversation.contact.phone,
            email: selectedConversation.contact.email,
            notes: selectedConversation.contact.notes,
            tags: updatedTags
          })
        })
      }
      await authenticatedFetch(`/api/conversations/${selectedConversation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESOLVED',
          isBlocked: true,
          isArchived: true
        })
      })
      toast({ title: t("blocked"), description: t("contactBlocked") })
      fetchConversations()
      setSelectedConversation(null)
      router.push("/inbox")
    } catch (error) {
      console.error("Block error", error)
      toast({ title: t("error"), description: t("failedToBlockContact"), variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], "voice_note.webm", { type: "audio/webm" });

        setIsSending(true);
        try {
          // Upload
          const formData = new FormData();
          formData.append('file', audioFile);

          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { ...getAuthHeader() },
            body: formData
          });

          const uploadData = await uploadRes.json();
          if (!uploadData.success) throw new Error(uploadData.error);

          // Send as msg
          await handleSendMessage(undefined, uploadData.url, { type: 'AUDIO' });
          toast({ title: t("sent"), description: t("voiceNoteSent") });
        } catch (error) {
          console.error('Error sending voice note:', error);
          toast({ title: t("error"), description: t("failedToSendVoiceNote"), variant: "destructive" });
        } finally {
          setIsSending(false);
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error in mic access:', err);
      toast({ title: t("error"), description: t("microphoneDenied"), variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const filteredConversations = (conversations || []).filter(conv => {
    const matchesSearch =
      conv.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.contact?.phone?.includes(searchQuery)

    const matchesBranch =
      selectedBranch === 'all' ||
      (conv.contact as any)?.branchId === selectedBranch

    const matchesFilter =
      filterType === 'all' ? true :
        filterType === 'unread' ? !conv.isRead :
          filterType === 'groups' ? (conv.contact.phone.includes('@g.us') || conv.contact.phone.length > 15 || (conv.contact as any).tags?.includes('group')) : true

    return matchesSearch && matchesBranch && matchesFilter
  })

  const [bookingFormData, setBookingFormData] = useState({
    agentId: "",
    date: "",
    notes: ""
  })

  const handleBooking = async () => {
    if (!selectedConversation || !bookingFormData.date) {
      toast({
        title: t("error"),
        description: t("fillRequiredFields"),
        variant: "destructive"
      })
      return
    }
    const role = getUserRole()
    const currentUser = getUser()
    const agentId = role === "AGENT" ? (currentUser?.id ?? null) : (bookingFormData.agentId || null)

    try {
      const response = await authenticatedFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedConversation.contactId,
          agentId,
          branch: (selectedConversation.branch as any)?.name || null,
          date: bookingFormData.date,
          notes: bookingFormData.notes
        })
      })

      const data = await response.json()

      if (data.success) {
        setIsBookingOpen(false)
        setBookingFormData({ agentId: "", date: "", notes: "" })
        toast({
          title: t("bookingConfirmed"),
          description: `${selectedConversation.contact.name} – ${t("bookingConfirmedDesc")}`,
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("failedToCreateBooking"),
        variant: "destructive"
      })
    }
  }

  const showComingSoon = (feature: string) => {
    toast({
      title: t("comingSoon"),
      description: `${feature} ${t("comingSoonDesc")}`,
    })
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // Dynamic "last active" from conversation and messages timestamps (refreshes every 30s)
  const [lastActiveTick, setLastActiveTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setLastActiveTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const lastActiveLabel = useMemo(() => {
    if (!selectedConversation) return ''
    const convTime = new Date(selectedConversation.lastMessageAt).getTime()
    const msgTimes = messages.map((m: Message) => new Date(m.createdAt).getTime())
    const last = msgTimes.length ? Math.max(convTime, ...msgTimes) : convTime
    const diffMs = Date.now() - last
    if (diffMs < 60_000) return language === 'ar' ? 'الآن' : 'Just now'
    return formatDistanceToNow(last, { addSuffix: true, locale: language === 'ar' ? ar : undefined })
  }, [selectedConversation, messages, language, lastActiveTick])

  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'facebook': return <Facebook className="h-3 w-3 text-blue-600" />
      case 'instagram': return <Instagram className="h-3 w-3 text-pink-600" />
      default: return <WhatsAppIcon className="h-3 w-3 text-green-500" />
    }
  }

  const formatMessageContent = (content: string | null | undefined, msg?: Message) => {
    const text = content != null ? String(content) : ""
    if (!text) return ""
    const mentions = (msg?.metadata as any)?.mentions as Array<{ id: string; name?: string }> | undefined
    const mentionMap = new Map<string, string>()
    if (Array.isArray(mentions)) {
      mentions.forEach((m) => {
        const digits = (m.id || '').replace(/\D/g, '')
        if (digits && (m.name || '').trim()) mentionMap.set(digits, (m.name || '').trim())
      })
    }
    const resolveName = (digits: string): string => {
      if (mentionMap.has(digits)) return mentionMap.get(digits)!
      const known = conversations.find((c) => c.contact.phone.replace(/\D/g, '').includes(digits) || digits.includes(c.contact.phone.replace(/\D/g, '')))
      return known ? known.contact.name : digits
    }
    const combinedRegex = /@(\d{10,})(?:@[cg]\.us)?|(\d{10,})@(?:[cg]\.us)?/g
    const parts: (string | ReactNode)[] = []
    let lastIndex = 0
    let match
    let key = 0
    while ((match = combinedRegex.exec(text)) !== null) {
      const num = (match[1] || match[2] || '').replace(/\D/g, '')
      if (num) {
        if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
        parts.push(<span key={key++} className="text-blue-500 font-medium mx-0.5">@{resolveName(num)}</span>)
        lastIndex = match.index + match[0].length
      }
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex))
    if (parts.length === 0) return text
    if (parts.length === 1 && typeof parts[0] === 'string') return parts[0]
    return <>{parts}</>
  }

  return (
    <AppLayout title={t("inbox")} fullBleed>
      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmBlockContact")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmBlockContactDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlockContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("blockContact")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="inbox-root bg-background md:border md:rounded-xl md:shadow-sm relative md:m-2">
        <div className="inbox-three-col flex-col md:flex-row">
          {/* LEFT COLUMN: Conversations List — fixed width, own scroll */}
          <div className={cn(
            "inbox-col-left bg-muted/10",
            "absolute md:relative z-0 w-full md:w-auto",
            dir === "rtl" ? "border-s border-border/50" : "border-e border-border/50",
            selectedConversation ? "hidden md:flex" : "flex"
          )}>
            {/* List Header */}
            <div className="p-4 space-y-3 border-b bg-card sticky top-0 z-10">
              {/* Branch Selector */}
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-full bg-muted/50 border-none shadow-none h-9 text-xs font-medium">
                  <SelectValue placeholder={t("selectBranch")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{getUserRole() === "ADMIN" ? t("allBranches") : t("myConversations")}</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("searchNameOrPhone")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9 bg-muted/50 border-none shadow-none"
                />
              </div>
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={filterType === 'all' ? "outline" : "default"} size="sm" className="gap-2 text-xs rounded-full h-8 shrink-0">
                      <Filter className="h-3 w-3" />
                      {filterType === 'all' ? t("filters") : filterType === 'unread' ? t("unread") : t("groupsOnly")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>{t("filterConversations")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFilterType('all')}>
                      {t("allChats")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterType('unread')}>
                      {t("unreadOnly")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterType('groups')}>
                      {t("groupsOnly")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => showComingSoon('Facebook')}
                    className="h-8 w-8 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100"
                  >
                    <Facebook className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => showComingSoon('Instagram')}
                    className="h-8 w-8 rounded-full text-pink-600 bg-pink-50 hover:bg-pink-100"
                  >
                    <Instagram className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 rounded-full text-green-600 bg-green-50 hover:bg-green-100 ring-2 ring-green-100"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">{t("loading")}</div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">{t("noConversations")}</div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => {
                      // Drive selection via URL so bottom nav and back behave predictably.
                      setSelectedConversation(conversation)
                      router.push(`/inbox?id=${conversation.id}`)
                    }}
                    className={cn(
                      "flex gap-3 p-4 border-b cursor-pointer hover:bg-muted/50 transition-all",
                      selectedConversation?.id === conversation.id
                        ? "bg-blue-50/50 border-s-4 border-s-primary"
                        : "border-s-4 border-s-transparent",
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {getInitials(conversation.contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -end-1 bg-white p-0.5 rounded-full shadow-sm">
                        {getPlatformIcon(conversation.platform)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm truncate max-w-[70%]">{conversation.contact.name}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {format(new Date(conversation.lastMessageAt), "h:mm a", { locale: dateLocale })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate line-clamp-1 opacity-80 pe-2">
                        {conversation.messages?.[0]?.content || t("noMessagesYet")}
                      </p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {conversation.leadStatus && (
                          <Badge variant={conversation.leadStatus === "New" ? "default" : "secondary"} className="h-5 px-1.5 text-[10px] uppercase tracking-wider rounded-md font-medium shrink-0">
                            {conversation.leadStatus === "New" ? t("leadStatusNew") : conversation.leadStatus === "Booked" ? t("leadStatusBooked") : t("leadStatusInProgress")}
                          </Badge>
                        )}
                        {(conversation.contact.phone.includes('@g.us') || conversation.contact.phone.length > 15 || (conversation.contact as any).tags?.includes('group')) && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase tracking-wider rounded-md font-medium text-pink-600 border-pink-200 bg-pink-50 shrink-0">
                            {t("group")}
                          </Badge>
                        )}
                        {!conversation.isRead && <div className="h-2 w-2 bg-red-500 rounded-full mt-1.5 shrink-0" />}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MIDDLE COLUMN: Chat Area — flex-1, scrolls internally */}
          {/* On Mobile: Show this ONLY if conversation IS selected (covers list) */}
          {selectedConversation ? (
            <div
              className={cn(
                "inbox-col-middle chat-column bg-slate-50 dark:bg-background z-40",
                "fixed inset-x-0 top-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] bg-background md:inset-auto",
                "md:relative md:bottom-auto md:z-0",
              )}
              dir={dir}
            >
              {/* Chat header — fixed */}
              <div className="inbox-chat-header h-14 md:h-16 border-b bg-card px-4 flex items-center justify-between shadow-sm z-30">
                <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                  {/* Mobile Back Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden -ms-2 me-1 h-10 w-10 min-w-10 rounded-full"
                    onClick={() => {
                      setSelectedConversation(null)
                      router.push("/inbox")
                    }}
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </Button>

                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback>{getInitials(selectedConversation.contact.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm flex items-center gap-1 truncate">
                      <span className="truncate">{selectedConversation.contact.name}</span>
                      <span className="shrink-0">{getPlatformIcon(selectedConversation.platform)}</span>
                    </h3>
                    <p className="text-xs text-green-600 flex items-center gap-1 truncate">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="truncate">{lastActiveLabel}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Mobile Info Button (Sheet Trigger) */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="xl:hidden h-9 w-9">
                        <Info className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side={dir === "rtl" ? "left" : "right"} className="p-0 w-full sm:w-[400px]">
                      <SidebarContent conversation={selectedConversation} onUpdate={() => fetchConversations()} />
                    </SheetContent>
                  </Sheet>

                  <Dialog open={isBookingOpen} onOpenChange={(open) => {
                    if (open) {
                      const role = getUserRole()
                      const currentUser = getUser()
                      if (role === "AGENT" && currentUser?.id) {
                        setBookingFormData(prev => ({ ...prev, agentId: currentUser.id }))
                      }
                    }
                    setIsBookingOpen(open)
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 h-8 hidden sm:flex">
                        <Calendar className="h-4 w-4" /> {t("book")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>{t("bookAppointment")}</DialogTitle>
                        <DialogDescription>
                          {t("createBookingFor")} {selectedConversation.contact.name}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="agent" className="text-end">{t("agent")}</Label>
                          {getUserRole() === "AGENT" ? (
                            <div className="col-span-3 text-sm text-muted-foreground py-2">
                              {getUser()?.name ?? t("selectAgent")}
                            </div>
                          ) : (
                            <Select
                              value={bookingFormData.agentId}
                              onValueChange={(value) => setBookingFormData(prev => ({ ...prev, agentId: value }))}
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={t("selectAgent")} />
                              </SelectTrigger>
                              <SelectContent>
                                {bookingAgents.map((agent) => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    {agent.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="date" className="text-end">{t("dateLabel")}</Label>
                          <Input
                            id="date"
                            type="date"
                            className="col-span-3"
                            value={bookingFormData.date}
                            onChange={(e) => setBookingFormData(prev => ({ ...prev, date: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="notes" className="text-end">{t("notes")}</Label>
                          <Textarea
                            id="notes"
                            placeholder={t("addNotesPlaceholder")}
                            className="col-span-3"
                            value={bookingFormData.notes}
                            onChange={(e) => setBookingFormData(prev => ({ ...prev, notes: e.target.value }))}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleBooking}>{t("confirmBooking")}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Resolve Button - hidden on small mobile */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex gap-2 h-8 text-green-600 border-green-200 hover:bg-green-50"
                    onClick={handleResolve}
                    disabled={isLoading}
                  >
                    <Check className="h-4 w-4" /> {isLoading ? t("saving") : t("resolve")}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t("chatOptions")}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setIsTemplatesOpen(true)}>
                        <Sparkles className="me-2 h-4 w-4" /> {t("messageTemplates")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsBotFlowsDialogOpen(true)}>
                        <Play className="me-2 h-4 w-4" /> {t("botFlows")}
                      </DropdownMenuItem>
                      {getUserRole() === "ADMIN" && (
                        <>
                          <DropdownMenuItem onClick={handleExportChat}>
                            <p className="flex items-center"><span className="me-2">📤</span> {t("exportChat")}</p>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={handleBlockContact}>
                            {t("blockContact")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Templates & Bots Dialogs */}
                  <Dialog open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
                    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{t("selectMessageTemplate")}</DialogTitle>
                        <DialogDescription>
                          {t("chooseTemplateToInsert")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        {templates.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            {templates.map((template) => (
                              <div
                                key={template.id}
                                className="flex flex-col gap-2 p-4 border rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group"
                                onClick={() => handleUseTemplate(template.content)}
                              >
                                <div className="flex justify-between items-center">
                                  <h4 className="font-semibold text-sm">{template.name}</h4>
                                  <Badge variant="secondary" className="text-[10px]">{template.category || t("general")}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 bg-muted p-2 rounded-lg group-hover:bg-white transition-colors">
                                  {template.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            {t("noTemplatesFound")}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isBotFlowsDialogOpen} onOpenChange={setIsBotFlowsDialogOpen}>
                    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{t("selectBotFlow")}</DialogTitle>
                        <DialogDescription>
                          {t("manuallyTriggerFlow")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        {botFlows.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            {botFlows.filter(f => f.isActive).map((flow) => (
                              <div
                                key={flow.id}
                                className="flex flex-col gap-2 p-4 border rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group"
                                onClick={() => {
                                  handleAcceptSuggestion(flow)
                                  setIsBotFlowsDialogOpen(false)
                                }}
                              >
                                <div className="flex justify-between items-center">
                                  <h4 className="font-semibold text-sm">{flow.name}</h4>
                                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                    {t("trigger")}: {flow.trigger}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {t("clickToStartFlow")}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            {t("noActiveBotFlows")}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Messages — only this area scrolls */}
              <div className="chat-messages inbox-chat-messages p-4 md:p-6 pb-4">
                {messages.map((message) => {
                  const isOutgoing = message.direction === "OUTGOING"
                  return (
                    <div
                      key={message.id}
                      className={`chat-message-row ${isOutgoing ? "outgoing" : "incoming"}`}
                    >
                      <div className={`chat-bubble-wrap group flex flex-col ${isOutgoing ? "outgoing items-end" : "incoming items-start"}`}>
                        <div
                          className={cn(
                            "chat-bubble rounded-[7.5px] px-2.5 py-1.5 shadow-sm text-sm",
                            isOutgoing
                              ? cn(
                                "bg-[#dcf8c6] dark:bg-[#005c4b] text-slate-800 dark:text-slate-100",
                                dir === 'rtl' ? "rounded-tl-none" : "rounded-tr-none"
                              )
                              : cn(
                                "bg-white dark:bg-[#202c33] text-gray-800 dark:text-slate-100 border border-gray-200 dark:border-white/10",
                                dir === 'rtl' ? "rounded-tr-none" : "rounded-tl-none"
                              )
                          )}
                        >
                          {!isOutgoing && (message as any).metadata?.authorName && (
                            <div className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 mb-1 leading-tight break-words overflow-visible">
                              {String((message as any).metadata.authorName).trim()}
                            </div>
                          )}
                          {message.quotedMessage && (
                            <div className="mb-2 pl-2 border-s-2 border-muted-foreground/30 text-xs text-muted-foreground">
                              <p className="font-medium text-foreground/80">{message.quotedMessage.sender?.name || message.quotedMessage.sender?.username || t("systemLabel")}</p>
                              <p className="truncate">{message.quotedMessage.content || (message.quotedMessage.type === 'AUDIO' ? '🎤' : message.quotedMessage.type === 'IMAGE' ? '🖼' : message.quotedMessage.type === 'VIDEO' ? '🎬' : message.quotedMessage.type === 'LOCATION' ? '📍' : '—')}</p>
                            </div>
                          )}
                          {(message.metadata as any)?.forwarded && (
                            <p className="text-[10px] text-muted-foreground/80 mb-1 flex items-center gap-1">
                              <Forward className="h-3 w-3" /> {t("forwarded") || "Forwarded"}
                            </p>
                          )}
                          {message.type === 'IMAGE' && message.mediaUrl ? (
                            <div className="rounded-lg overflow-hidden max-w-sm relative group">
                              <img
                                src={getFullMediaUrl(message.mediaUrl)}
                                alt={t("sentImageAlt")}
                                className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity min-h-[100px] bg-gray-100"
                                onClick={() => setPreviewImage(getFullMediaUrl(message.mediaUrl!) || null)}
                                onError={(e) => {
                                  // Fallback for broken images (e.g. missing file after deploy or wrong origin)
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              {/* Fallback View */}
                              <div className="hidden flex-col items-center justify-center p-4 bg-gray-100 text-gray-500 gap-2 min-w-[200px]">
                                <span className="text-xs">{t("imageNotLoaded")}</span>
                                <a href={getFullMediaUrl(message.mediaUrl)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                                  {t("openLink")}
                                </a>
                              </div>
                              {message.content && !message.content.startsWith('http') && <p className="mt-2 text-xs opacity-90">{message.content}</p>}
                            </div>
                          ) : message.type === 'AUDIO' && message.mediaUrl ? (
                            <div className="flex flex-col gap-1 min-w-[240px] p-2">
                              <audio controls className="w-full h-10 accent-primary" src={message.mediaUrl} />
                              <div className="flex justify-end">
                                <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">
                                  {t("downloadAudio")}
                                </a>
                              </div>
                            </div>
                          ) : message.type === 'VIDEO' && message.mediaUrl ? (
                            <div className="rounded-lg overflow-hidden max-w-sm bg-black/5">
                              {failedVideoIds.has(message.id) ? (
                                <div className="flex flex-col items-center justify-center gap-2 p-6 min-h-[120px] text-center">
                                  <Video className="h-10 w-10 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">{t("videoUnavailable") || "Video unavailable"}</p>
                                  <a href={getFullMediaUrl(message.mediaUrl)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">
                                    {t("downloadVideo")}
                                  </a>
                                </div>
                              ) : (
                                <video
                                  controls
                                  className="w-full h-auto max-h-[300px]"
                                  preload="metadata"
                                  playsInline
                                  src={getFullMediaUrl(message.mediaUrl)}
                                  onError={() => setFailedVideoIds((prev) => new Set(prev).add(message.id))}
                                />
                              )}
                              {!failedVideoIds.has(message.id) && (
                                <div className="flex justify-end p-1">
                                  <a href={getFullMediaUrl(message.mediaUrl)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">
                                    {t("downloadVideo")}
                                  </a>
                                </div>
                              )}
                              {message.content && !message.content.startsWith('http') && <p className="mt-2 text-xs opacity-90">{message.content}</p>}
                            </div>
                          ) : message.type === 'LOCATION' ? (
                            <div className="rounded-xl overflow-hidden max-w-[280px] border shadow-sm bg-white group/map">
                              <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-red-500 fill-red-500/20" />
                                  <span className="text-xs font-bold text-slate-700">{t("locationLabel")}</span>
                                </div>
                                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover/map:text-primary transition-colors" />
                              </div>
                              <div
                                className="h-[140px] w-full bg-slate-100 flex items-center justify-center cursor-pointer relative overflow-hidden"
                                onClick={() => window.open(message.content, '_blank')}
                              >
                                <img
                                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${message.content.split('q=')[1] || message.content.split('ll=')[1]}&zoom=15&size=300x150&sensor=false&key=`}
                                  alt="Map Preview"
                                  className="w-full h-full object-cover opacity-80"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    if (target.nextElementSibling) {
                                      (target.nextElementSibling as HTMLElement).style.display = 'flex';
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100" style={{ display: "none" }}>
                                  <div className="p-3 bg-white rounded-full shadow-sm mb-2">
                                    <MapPin className="h-6 w-6 text-red-500 fill-red-500/10" />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{t("clickToViewInMaps")}</span>
                                </div>
                              </div>
                              <a href={message.content} target="_blank" rel="noopener noreferrer" className="block p-3 text-xs text-primary font-medium hover:bg-slate-50 transition-colors text-center border-t">
                                {t("openInMaps")}
                              </a>
                            </div>
                          ) : message.type === 'DOCUMENT' && message.mediaUrl ? (
                            <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-slate-800 border">
                              <div className="bg-white p-2 rounded shadow-sm">
                                <Paperclip className="h-5 w-5 text-slate-500" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-medium truncate max-w-[150px]">{message.content || t("documentLabel")}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">{t("downloadLabel")}</span>
                              </div>
                            </a>
                          ) : (
                            <div
                              className="text-sm whitespace-pre-wrap break-words leading-relaxed text-gray-800 dark:text-gray-100 w-full max-w-full overflow-visible inline-block min-w-[1ch]"
                              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                              dir="auto"
                            >
                              {formatMessageContent(message.content, message)}
                            </div>
                          )}
                        </div>
                        <div className="chat-bubble-meta mt-1 ms-1 text-[10px] text-gray-500 flex items-center gap-1">
                          <span>{format(new Date(message.createdAt), "h:mm a", { locale: dateLocale })}</span>
                          {isOutgoing && (
                            <span className={cn("text-[10px]", message.status === "READ" ? "text-blue-500" : "text-gray-400")} aria-hidden>
                              {message.status === "READ" ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                            </span>
                          )}
                        </div>
                        {isOutgoing && (
                          <div
                            className={cn(
                              "mt-0.5 text-[10px] text-muted-foreground",
                              dir === "rtl" ? "text-start" : "text-end"
                            )}
                            aria-label={t("sentBy")}
                          >
                            — {t("sentBy")}: <span className="break-keep whitespace-nowrap inline-block max-w-full overflow-hidden text-ellipsis align-bottom">{message.sender?.name?.trim() || message.sender?.username || (message.direction === "OUTGOING" ? t("merasTeamLabel") : t("systemLabel"))}</span>
                          </div>
                        )}
                        {/* Reply / Forward — visible on hover */}
                        <div className={cn("mt-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity", dir === "rtl" ? "justify-start" : "justify-end")}>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReplyingTo(message)} title={t("reply") || "Reply"}>
                            <Reply className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForwardMessage(message); setForwardTargetConversation(null); }} title={t("forward") || "Forward"}>
                            <Forward className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div ref={chatMessagesEndRef} aria-hidden className="min-h-2" />
              </div>

              {/* Quick-reply template buttons (WhatsApp/Messenger style) — show when last customer message matches trigger */}
              {quickReplyTemplates.length > 0 && (
                <div className="border-t bg-muted/30 px-2 md:px-3 py-2 flex flex-wrap gap-2">
                  {quickReplyTemplates.map((tpl) => (
                    <Button
                      key={tpl.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full text-sm font-medium shrink-0"
                      onClick={() => {
                        handleSendMessage(tpl.content)
                        setQuickReplyTemplates([])
                      }}
                    >
                      {tpl.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* Replying to strip (Reply preview) */}
              {replyingTo && (
                <div className="border-t bg-muted/20 px-3 py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0 border-s-4 border-primary pl-2 py-1">
                    <p className="text-xs font-medium text-muted-foreground">{t("replyingTo") || "Replying to"}</p>
                    <p className="text-sm truncate">{replyingTo.content || (replyingTo.type === 'AUDIO' ? '🎤 Voice note' : replyingTo.type === 'IMAGE' ? '🖼 Image' : replyingTo.type === 'VIDEO' ? '🎬 Video' : replyingTo.type === 'LOCATION' ? '📍 Location' : '—')}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setReplyingTo(null)} aria-label={t("cancel")}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Input bar — fixed at bottom */}
              <div className="inbox-chat-input bg-card chat-input-bar border-t p-2 md:p-3 flex items-end gap-2">
                <div className="flex items-center gap-1 md:gap-2 bg-muted/30 p-1 md:p-1.5 rounded-[24px] flex-1 min-w-0 border focus-within:ring-2 ring-primary/20 transition-all min-h-[44px]">
                  {/* Emoji Button */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:bg-background h-8 w-8 md:h-9 md:w-9 rounded-full shrink-0"
                      >
                        <Smile className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 border-none bg-transparent shadow-none" side="top" align="start">
                      <EmojiPicker
                        onEmojiClick={(emojiData: EmojiClickData) => setNewMessage(prev => prev + emojiData.emoji)}
                        autoFocusSearch={false}
                        width={300}
                        height={400}
                      />
                    </PopoverContent>
                  </Popover>

                  <div className="relative flex-1 min-w-0 flex flex-col">
                    <Input
                      dir={dir}
                      className="border-none bg-transparent shadow-none focus-visible:ring-0 flex-1 min-w-0 h-9 px-2 text-base"
                      placeholder={t("typeYourMessage")}
                      value={newMessage}
                      onChange={(e) => {
                        const v = e.target.value
                        setNewMessage(v)
                        const lastAt = v.lastIndexOf("@")
                        if (lastAt >= 0) {
                          const after = v.slice(lastAt + 1)
                          if (!after.includes(" ") && !after.includes("\n")) {
                            setMentionQuery(after.toLowerCase())
                            setMentionPickerOpen(true)
                            return
                          }
                        }
                        setMentionPickerOpen(false)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendMessage()
                        if (mentionPickerOpen && (e.key === "Escape" || e.key === "Backspace" && !mentionQuery)) setMentionPickerOpen(false)
                      }}
                    />
                    {mentionPickerOpen && selectedConversation && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 max-h-40 overflow-y-auto rounded-lg border bg-popover shadow-md z-50">
                        {conversations
                          .filter((c) => c.id !== selectedConversation.id && c.contact?.name?.toLowerCase().includes(mentionQuery))
                          .slice(0, 8)
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                              onClick={() => {
                                const lastAt = newMessage.lastIndexOf("@")
                                const before = lastAt >= 0 ? newMessage.slice(0, lastAt) : newMessage
                                setNewMessage(before + "@" + (c.contact?.name || c.contact?.phone || "") + " ")
                                setMentionPickerOpen(false)
                              }}
                            >
                              <span className="font-medium">{c.contact?.name || c.contact?.phone}</span>
                            </button>
                          ))}
                        {conversations.filter((c) => c.id !== selectedConversation.id && c.contact?.name?.toLowerCase().includes(mentionQuery)).length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">{t("noContactsToMention") || "No contacts to mention"}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Attachments Group */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-background shrink-0 rounded-full h-8 w-8 md:h-9 md:w-9"
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setIsSending(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const uploadRes = await fetch('/api/upload', { method: 'POST', headers: { ...getAuthHeader() }, body: formData });
                          const uploadData = await uploadRes.json();
                          if (!uploadData.success) throw new Error(uploadData.error);
                          await handleSendMessage(undefined, uploadData.url);
                          toast({ title: t("sent"), description: t("fileSentSuccessfully") });
                        } catch (error) {
                          toast({ title: t("error"), description: t("failedToSendFile"), variant: "destructive" });
                        } finally {
                          setIsSending(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-background shrink-0 rounded-full h-8 w-8 md:h-9 md:w-9"
                      onClick={handleLocationShare}
                      title={t("location")}
                    >
                      <MapPin className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Floating Action Button (Send / Mic) */}
                <div className="shrink-0 mb-0.5">
                  {newMessage.trim() ? (
                    <Button
                      size="icon"
                      onClick={() => handleSendMessage()}
                      disabled={isSending}
                      className="rounded-full h-10 w-10 md:h-11 md:w-11 shadow-sm transition-transform active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Send className="h-4 w-4 md:h-5 md:w-5 rtl:rotate-180" />
                    </Button>
                  ) : (
                    <Button
                      variant={isRecording ? "destructive" : "default"}
                      size="icon"
                      className={cn(
                        "rounded-full h-10 w-10 md:h-11 md:w-11 shadow-sm transition-all active:scale-95",
                        isRecording ? "animate-pulse ring-4 ring-destructive/30" : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      {isRecording ? <div className="h-3 w-3 bg-white rounded-sm" /> : <Mic className="h-5 w-5" />}
                    </Button>
                  )}
                </div>

                {/* Dynamic AI Suggestion Fixed Overlay */}
                {suggestedFlow && !isSuggestionSnoozed && (
                  <div className="absolute bottom-20 start-4 end-4 z-20">
                    <div className="flex items-center justify-between p-4 bg-white border-2 border-purple-200 rounded-2xl shadow-xl animate-in fade-in zoom-in duration-300">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-tight">{t("recommendStartFlow").replace("{name}", suggestedFlow.name)}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{t("autoDetectedTrigger").replace("{trigger}", suggestedFlow.trigger)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-9 px-4 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                          onClick={() => {
                            setIsSuggestionSnoozed(true)
                            setSuggestedFlow(null)
                            setTimeout(() => setIsSuggestionSnoozed(false), 10000)
                          }}
                        >
                          {t("dismiss")}
                        </Button>
                        <Button
                          size="sm"
                          className="h-9 px-5 rounded-full bg-purple-600 hover:bg-purple-700 text-white gap-2 text-xs font-bold shadow-md shadow-purple-200"
                          onClick={() => handleAcceptSuggestion(suggestedFlow)}
                        >
                          <Play className="h-4 w-4 fill-current" /> {t("useFlow")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            // Desktop-only placeholder: on mobile we show ONLY the list when no conversation selected
            !isMobile && (
              <div className="inbox-col-middle flex flex-col items-center justify-center bg-slate-50 dark:bg-background text-center p-8 min-h-0">
                <div className="bg-white dark:bg-card p-4 rounded-full shadow-sm mb-4">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{t("noConversationSelected")}</h3>
                {phoneParam ? (
                  <p className="text-muted-foreground text-sm max-w-xs mt-2">{t("noConversationWithNumberYet") || "No conversation with this number yet. When someone sends a message to this WhatsApp number, the chat will appear here."}</p>
                ) : (
                  <p className="text-muted-foreground text-sm max-w-xs mt-2">{t("selectConversationToView")}</p>
                )}
              </div>
            )
          )
          }

          {/* RIGHT COLUMN: Contact details — fixed width, own scroll */}
          {selectedConversation && (
            <div className={cn("inbox-col-right hidden xl:flex bg-card", dir === "rtl" ? "border-e border-border/50" : "border-s border-border/50")}>
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
                <SidebarContent conversation={selectedConversation} onUpdate={() => fetchConversations()} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forward message dialog */}
      <Dialog open={!!forwardMessage} onOpenChange={(open) => { if (!open) { setForwardMessage(null); setForwardTargetConversation(null); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("forward") || "Forward"}</DialogTitle>
            <DialogDescription>{t("forwardToConversation") || "Choose a conversation to forward this message to."}</DialogDescription>
          </DialogHeader>
          {forwardMessage && (
            <div className="space-y-4 py-4">
              <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-2">
                {filteredConversations
                  .filter(c => c.id !== selectedConversation?.id)
                  .map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-start transition-colors",
                        forwardTargetConversation?.id === conv.id ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                      )}
                      onClick={() => setForwardTargetConversation(conv)}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{conv.contact.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{conv.contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{conv.contact.phone}</p>
                      </div>
                    </button>
                  ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setForwardMessage(null); setForwardTargetConversation(null); }}>{t("cancel")}</Button>
                <Button
                  disabled={!forwardTargetConversation || isSending}
                  onClick={async () => {
                    if (!forwardMessage || !forwardTargetConversation) return
                    await handleSendMessage(
                      forwardMessage.content,
                      forwardMessage.mediaUrl ?? undefined,
                      { type: forwardMessage.type, forwarded: true, targetConversationId: forwardTargetConversation.id }
                    )
                    setForwardMessage(null)
                    setForwardTargetConversation(null)
                    toast({ title: t("sent"), description: t("forwarded") || "Message forwarded." })
                  }}
                >
                  <Forward className="h-4 w-4 mr-2" />
                  {t("forward") || "Forward"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-[85vw] max-w-[95vw] h-fit p-0 border-none bg-transparent shadow-none outline-none">
          <div className="relative w-full flex items-center justify-center p-0">
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-auto max-h-[90vh] object-contain rounded-xl shadow-2xl"
              />
            )}
            <Button
              variant="secondary"
              size="icon"
              className="absolute -top-4 -end-4 rounded-full bg-black/60 text-white hover:bg-black/80 border-2 border-white/20 h-10 w-10 shadow-xl z-50"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout >
  )
}
