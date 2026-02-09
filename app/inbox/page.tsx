"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
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
  MessageCircle, Sparkles, Play, Building2, StickyNote, Tag, CheckCheck, ExternalLink
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { format } from "date-fns"
import { getUserRole, getUser } from "@/lib/auth"
import { Sidebar } from "./Sidebar"
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Message {
  id: string
  content: string
  direction: "INCOMING" | "OUTGOING"
  status: "SENT" | "DELIVERED" | "READ" | "FAILED"
  createdAt: string
  type?: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "LOCATION"
  mediaUrl?: string
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
  const [branches, setBranches] = useState<Branch[]>([])
  const [botFlows, setBotFlows] = useState<BotFlow[]>([])
  const [suggestedFlow, setSuggestedFlow] = useState<BotFlow | null>(null)
  const [isSuggestionSnoozed, setIsSuggestionSnoozed] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [lastOrderId, setLastOrderId] = useState<string>("N/A")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const { toast } = useToast()
  const { t, language } = useI18n()

  // ... existing refs ...
  const searchParams = useSearchParams()
  const conversationIdParam = searchParams.get('id')

  // Recording Refs
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    fetchConversations()
    fetchUsers()
    fetchBranches()
    fetchBotFlows()
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
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
      const response = await fetch(`/api/bookings?contactId=${contactId}`)
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

  const fetchBotFlows = async () => {
    try {
      const response = await fetch('/api/bot-flows')
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
      await fetch('/api/bot-flows/track', {
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

  // Polling for Conversations List (every 5 seconds - optimized)
  useEffect(() => {
    const interval = setInterval(() => {
      // Don't show loading spinner on background refresh
      fetch('/api/conversations')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.conversations) {
            const enrichedConversations = data.conversations.map((c: any, index: number) => ({
              ...c,
              platform: 'whatsapp',
              leadScore: index === 0 ? 'Hot' : 'Warm',
              leadStatus: index === 0 ? 'New' : index === 1 ? 'Booked' : 'In Progress',
              branch: c.branch || null
            }));
            // Only update if data actually changed
            setConversations(prev => {
              if (JSON.stringify(prev) === JSON.stringify(enrichedConversations)) {
                return prev;
              }
              return enrichedConversations;
            });
          }
        })
        .catch(err => console.error('Polling convos error:', err));
    }, 5000); // Optimized: 5 seconds instead of 3
    return () => clearInterval(interval);
  }, []);

  // Polling for Active Conversation Messages (every 4 seconds - optimized)
  useEffect(() => {
    if (!selectedConversation) return;

    const interval = setInterval(() => {
      fetch(`/api/messages?conversationId=${selectedConversation.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.messages) {
            setMessages(prev => {
              // Optimized check to avoid unnecessary re-renders
              if (prev.length !== data.messages.length) {
                return data.messages;
              }
              // Check if last message ID changed (new incoming)
              if (prev.length > 0 && data.messages.length > 0) {
                const lastPrev = prev[prev.length - 1];
                const lastNew = data.messages[data.messages.length - 1];
                if (lastPrev.id !== lastNew.id) return data.messages;
              }
              return prev;
            });
          }
        })
        .catch(err => console.error('Polling messages error:', err));
    }, 4000); // Optimized: 4 seconds instead of 3
    return () => clearInterval(interval);
  }, [selectedConversation?.id]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (data.success) {
        setUsers(data.data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchBranches = async () => {
    try {
      const userRole = getUserRole()
      const currentUser = getUser()

      const response = await fetch('/api/branches')
      const data = await response.json()
      if (data.success) {
        let filteredBranches = data.branches.filter((b: Branch) => b.isActive)

        // For AGENT: only show assigned branches
        // For ADMIN/SUPERVISOR: show all branches
        if (userRole === 'AGENT' && currentUser) {
          // Fetch user's assigned branches
          const userResponse = await fetch(`/api/users/${currentUser.id}`)
          const userData = await userResponse.json()

          if (userData.success && userData.data.branches) {
            const assignedBranchIds = userData.data.branches.map((b: Branch) => b.id)
            filteredBranches = filteredBranches.filter((b: Branch) =>
              assignedBranchIds.includes(b.id)
            )
          }
        }

        setBranches(filteredBranches)
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
    }
  }

  const fetchConversations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/conversations')
      const data = await response.json()

      if (data.success && data.conversations) {
        // Enriched mock data for UI demo purposes
        const enrichedConversations = data.conversations.map((c: any, index: number) => ({
          ...c,
          // Platform is almost always WhatsApp now as requested
          platform: 'whatsapp',
          leadScore: index === 0 ? 'Hot' : 'Warm',
          leadStatus: index === 0 ? 'New' : index === 1 ? 'Booked' : 'In Progress',
          // Branch will come from database or be null
          branch: c.branch || null
        }))

        setConversations(enrichedConversations)

        if (conversationIdParam) {
          const target = enrichedConversations.find((c: Conversation) => c.id === conversationIdParam)
          if (target) {
            setSelectedConversation(target)
          } else if (enrichedConversations.length > 0 && !selectedConversation) {
            setSelectedConversation(enrichedConversations[0])
          }
        } else if (enrichedConversations.length > 0 && !selectedConversation) {
          setSelectedConversation(enrichedConversations[0])
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
      const response = await fetch(`/api/messages?conversationId=${conversationId}`)
      const data = await response.json()

      if (data.success) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSendMessage = async (text?: string, mediaUrl?: string) => {
    const contentToSend = text !== undefined ? text : newMessage;
    if ((!contentToSend.trim() && !mediaUrl) || !selectedConversation) return

    try {
      setIsSending(true)

      // Get the first connected WhatsApp account
      let whatsappAccountId = null
      try {
        const accountsRes = await fetch('/api/whatsapp/accounts')
        const accountsData = await accountsRes.json()
        if (accountsData.success && accountsData.accounts && accountsData.accounts.length > 0) {
          const connectedAccount = accountsData.accounts.find((acc: any) => acc.status === 'CONNECTED')
          if (connectedAccount) {
            whatsappAccountId = connectedAccount.id
          }
        }
      } catch (err) {
        console.error('Error fetching WhatsApp accounts:', err)
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: contentToSend,
          direction: 'OUTGOING',
          type: 'TEXT', // Backend handles media type logic based on mediaUrl
          mediaUrl: mediaUrl,
          whatsappAccountId: whatsappAccountId // Include the account ID
        })
      })

      const data = await response.json()

      if (data.success) {
        if (!mediaUrl) setNewMessage("") // Only clear input if not a file upload (which clears itself)
        fetchMessages(selectedConversation.id)
        // Optimistic update for last message time
        setConversations(prev => prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, lastMessageAt: new Date().toISOString() }
            : c
        ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()))
      } else {
        toast({ title: t("error"), description: t("failedToSendMessage"), variant: "destructive" })
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
        handleSendMessage(mapLink);
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
      const response = await fetch('/api/templates?status=APPROVED')
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
      const response = await fetch(`/api/conversations/${selectedConversation.id}`, {
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
        setSelectedConversation(null)
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


  const handleBlockContact = async () => {
    if (!selectedConversation) return

    if (confirm(t("blockConfirm"))) {
      try {
        setIsLoading(true)

        // 1. Update Contact Tags (Add 'blocked')
        const currentTags = selectedConversation.contact.tags
          ? (Array.isArray(selectedConversation.contact.tags) ? selectedConversation.contact.tags : String(selectedConversation.contact.tags).split(','))
          : []

        if (!currentTags.includes('blocked')) {
          const updatedTags = [...currentTags, 'blocked']

          await fetch(`/api/contacts/${selectedConversation.contactId}`, {
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

        // 2. Block Conversation
        await fetch(`/api/conversations/${selectedConversation.id}`, {
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

      } catch (error) {
        console.error("Block error", error)
        toast({ title: t("error"), description: t("failedToBlockContact"), variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
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
            body: formData
          });

          const uploadData = await uploadRes.json();
          if (!uploadData.success) throw new Error(uploadData.error);

          // Send as msg
          await handleSendMessage(undefined, uploadData.url);
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
          filterType === 'groups' ? (conv.contact.id.includes('@g.us') || (conv.contact as any).tags?.includes('whatsapp-group')) : true

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

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedConversation.contactId,
          agentId: bookingFormData.agentId || null,
          branch: selectedConversation.branch || null,
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
        description: t("failedToCreateBooking"),
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

  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'facebook': return <Facebook className="h-3 w-3 text-blue-600" />
      case 'instagram': return <Instagram className="h-3 w-3 text-pink-600" />
      default: return <WhatsAppIcon className="h-3 w-3 text-green-500" />
    }
  }

  return (
    <AppLayout title={t("inbox")}>
      <div className="flex h-[calc(100vh-8rem)] bg-background border rounded-xl overflow-hidden shadow-sm">

        {/* LEFT COLUMN: Conversations List (25% or w-80) */}
        <div className="w-[350px] flex flex-col border-r bg-muted/10">
          <div className="p-4 space-y-3 border-b bg-card">
            {/* Branch Selector */}
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-full bg-muted/50 border-none shadow-none h-9 text-xs font-medium">
                <SelectValue placeholder={t("selectBranch")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allBranches")}</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.name}>
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
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={filterType === 'all' ? "outline" : "default"} size="sm" className="gap-2 text-xs rounded-full h-8">
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
              <div className="flex gap-1">
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

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">{t("loading")}</div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">{t("noConversations")}</div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`flex gap-3 p-4 border-b cursor-pointer hover:bg-muted/50 transition-all ${selectedConversation?.id === conversation.id ? 'bg-blue-50/50 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
                    }`}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {getInitials(conversation.contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm">
                      {getPlatformIcon(conversation.platform)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm truncate">{conversation.contact.name}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(conversation.lastMessageAt), 'h:mm a')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate line-clamp-1 opacity-80">
                      {conversation.messages?.[0]?.content || t("noMessagesYet")}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {conversation.leadStatus && (
                        <Badge variant={conversation.leadStatus === 'New' ? "default" : "secondary"} className="h-5 px-1.5 text-[10px] uppercase tracking-wider rounded-md font-medium">
                          {conversation.leadStatus}
                        </Badge>
                      )}
                      {(conversation.contact.id.includes('@g.us') || (conversation.contact as any).tags?.includes('whatsapp-group')) && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase tracking-wider rounded-md font-medium text-pink-600 border-pink-200 bg-pink-50">
                          {t("group")}
                        </Badge>
                      )}
                      {!conversation.isRead && <div className="h-2 w-2 bg-red-500 rounded-full mt-1.5" />}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN: Chat Area (50% or flex-1) */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col bg-slate-50 relative">
            {/* Header */}
            <div className="h-16 border-b bg-card px-6 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{getInitials(selectedConversation.contact.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    {selectedConversation.contact.name}
                    {getPlatformIcon(selectedConversation.platform)}
                    <Badge
                      variant="outline"
                      className="ms-2 text-[10px] font-normal text-muted-foreground bg-slate-50 border-slate-200 cursor-help"
                      title={botFlows.filter(f => f.isActive).map(f => f.trigger).join(', ') || 'None'}
                    >
                      Scanning ({botFlows.filter(f => f.isActive).length})
                    </Badge>
                  </h3>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    {t("lastActiveAgo")} 2 min
                  </p>
                </div>
                {/* Debug Match Info */}
                {suggestedFlow && (
                  <Badge variant="outline" className="ms-4 bg-purple-50 text-purple-700 animate-pulse border-purple-200">
                    DEBUG: Match Found ({suggestedFlow.name})
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-8">
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
                        <Select
                          value={bookingFormData.agentId}
                          onValueChange={(value) => setBookingFormData(prev => ({ ...prev, agentId: value }))}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder={t("selectAgent")} />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

                {/* Resolve and Options */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-8 text-green-600 border-green-200 hover:bg-green-50"
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
                    <DropdownMenuItem onClick={handleExportChat}>
                      <p className="flex items-center"><span className="me-2">📤</span> {t("exportChat")}</p>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={handleBlockContact}>
                      {t("blockContact")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Templates Dialog */}
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

                {/* Bot Flows Dialog */}
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'OUTGOING'
                    ? (language === 'ar' ? 'justify-start' : 'justify-end')
                    : (language === 'ar' ? 'justify-end' : 'justify-start')}`}
                >
                  <div className={`max-w-[70%] group relative ${message.direction === 'OUTGOING'
                    ? (language === 'ar' ? 'items-start' : 'items-end')
                    : (language === 'ar' ? 'items-end' : 'items-start')} flex flex-col`}>
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm text-sm ${message.direction === 'OUTGOING'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-white text-gray-800 border rounded-bl-none'
                        }`}
                    >
                      {message.type === 'IMAGE' && message.mediaUrl ? (
                        <div className="rounded-lg overflow-hidden max-w-sm">
                          <img src={message.mediaUrl} alt="Sent Image" className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setPreviewImage(message.mediaUrl || null)} />
                          {message.content && !message.content.startsWith('http') && <p className="mt-2 text-xs opacity-90">{message.content}</p>}
                        </div>
                      ) : message.type === 'AUDIO' && message.mediaUrl ? (
                        <div className="flex items-center gap-2 min-w-[250px] p-1">
                          <audio controls className="w-full h-10 accent-primary" src={message.mediaUrl} />
                        </div>
                      ) : message.type === 'VIDEO' && message.mediaUrl ? (
                        <div className="rounded-lg overflow-hidden max-w-sm">
                          <video controls className="w-full h-auto max-h-[300px]" src={message.mediaUrl} />
                          {message.content && !message.content.startsWith('http') && <p className="mt-2 text-xs opacity-90">{message.content}</p>}
                        </div>
                      ) : message.type === 'LOCATION' ? (
                        <div className="rounded-xl overflow-hidden max-w-[280px] border shadow-sm bg-white group/map">
                          <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-red-500 fill-red-500/20" />
                              <span className="text-xs font-bold text-slate-700">Location</span>
                            </div>
                            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover/map:text-primary transition-colors" />
                          </div>
                          <div
                            className="h-[140px] w-full bg-slate-100 flex items-center justify-center cursor-pointer relative overflow-hidden"
                            onClick={() => window.open(message.content, '_blank')}
                          >
                            <img
                              src={`https://maps.googleapis.com/maps/api/staticmap?center=${message.content.split('q=')[1]}&zoom=15&size=300x150&sensor=false&key=`}
                              alt="Map Preview"
                              className="w-full h-full object-cover opacity-80"
                              onError={(e) => {
                                (e.target as any).style.display = 'none';
                                (e.target as any).nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50" style={{ display: 'none' }}>
                              <MapPin className="h-8 w-8 text-red-500 mb-2 animate-bounce" />
                              <span className="text-[10px] font-medium text-slate-500 px-4 text-center">Click to view location in Google Maps</span>
                            </div>
                          </div>
                          <a href={message.content} target="_blank" rel="noopener noreferrer" className="block p-3 text-xs text-primary font-medium hover:bg-slate-50 transition-colors text-center border-t">
                            Open in Maps
                          </a>
                        </div>
                      ) : message.type === 'DOCUMENT' && message.mediaUrl ? (
                        <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-slate-800 border">
                          <div className="bg-white p-2 rounded shadow-sm">
                            <Paperclip className="h-5 w-5 text-slate-500" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate max-w-[150px]">{message.content || "Document"}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">Download</span>
                          </div>
                        </a>
                      ) : (
                        message.content
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                      {format(new Date(message.createdAt), 'h:mm a')}
                      {message.direction === 'OUTGOING' && (
                        <span className="ms-1 opacity-70">
                          {message.status === 'READ' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}

              {/* Dynamic AI Suggestion (Moved to fixed overlay below) */}

            </div>

            {/* Input */}
            <div className="p-4 bg-card border-t mt-auto">
              <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-xl">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:bg-background"
                  onClick={() => document.getElementById('file-upload')?.click()}
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
                      // 1. Upload file
                      const formData = new FormData();
                      formData.append('file', file);

                      const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                      });

                      const uploadData = await uploadRes.json();
                      if (!uploadData.success) throw new Error(uploadData.error);

                      // 2. Send Media Message
                      await handleSendMessage(undefined, uploadData.url); // We'll update handleSendMessage to accept mediaUrl

                      toast({
                        title: t("sent"),
                        description: t("fileSentSuccessfully"),
                      });
                    } catch (error) {
                      console.error('Error sending file:', error);
                      toast({
                        title: t("error"),
                        description: t("failedToSendFile"),
                        variant: "destructive"
                      });
                    } finally {
                      setIsSending(false);
                      // Reset input
                      e.target.value = '';
                    }
                  }}
                />

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-background"
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

                <Input
                  className="border-none bg-transparent shadow-none focus-visible:ring-0 px-2"
                  placeholder={t("typeYourMessage")}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                {newMessage.trim() ? (
                  <Button size="icon" onClick={() => handleSendMessage()} disabled={isSending} className="rounded-lg h-9 w-9"><Send className="h-4 w-4" /></Button>
                ) : (
                  <>
                    <Button
                      variant={isRecording ? "destructive" : "ghost"}
                      size="icon"
                      className={isRecording ? "animate-pulse" : "text-muted-foreground hover:bg-background"}
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      {isRecording ? <div className="h-3 w-3 bg-white rounded-sm" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-background"
                      onClick={handleLocationShare}
                    >
                      <MapPin className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Dynamic AI Suggestion Fixed Overlay */}
              {suggestedFlow && !isSuggestionSnoozed && (
                <div className="absolute bottom-20 left-4 right-4 z-20">
                  <div className="flex items-center justify-between p-4 bg-white border-2 border-purple-200 rounded-2xl shadow-xl animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">Recommend: Start "{suggestedFlow.name}"?</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Auto-detected keyword matching trigger: "{suggestedFlow.trigger}"</p>
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
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 px-5 rounded-full bg-purple-600 hover:bg-purple-700 text-white gap-2 text-xs font-bold shadow-md shadow-purple-200"
                        onClick={() => handleAcceptSuggestion(suggestedFlow)}
                      >
                        <Play className="h-4 w-4 fill-current" /> Use Flow
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div >
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-center p-8">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">{t("noConversationSelected")}</h3>
            <p className="text-muted-foreground text-sm max-w-xs mt-2">{t("selectConversationToView")}</p>
          </div>
        )
        }

        {/* RIGHT COLUMN: CRM Sidebar (25% or w-80) */}
        {
          selectedConversation && (
            <Sidebar
              conversation={selectedConversation}
              onUpdate={() => {
                // Refresh conversations to reflect changes (assignment, etc.)
                fetchConversations()
              }}
            />
          )
        }
      </div >

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            )}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 rounded-full bg-black/50 text-white hover:bg-black/70 border-none h-8 w-8"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout >
  )
}
