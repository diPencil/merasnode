"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { useI18n } from "@/lib/i18n"
import { authenticatedFetch, getUser } from "@/lib/auth"
import { format } from "date-fns"
import { ArrowLeft, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  content: string
  createdAt: string
  senderId: string
  sender: { id: string; name: string }
}

interface OtherUser {
  id: string
  name: string
  status: "ONLINE" | "OFFLINE" | "AWAY"
}

export default function UserInternalChatPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useI18n()
  const { toast } = useToast()
  const userId = params.id as string
  const currentUser = getUser()

  const [messages, setMessages] = useState<Message[]>([])
  const [other, setOther] = useState<OtherUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = () => {
    authenticatedFetch(`/api/users/${userId}/internal-chat/messages`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setMessages(data.data.messages || [])
          setOther(data.data.other || null)
        }
      })
      .catch(() => toast({ title: t("error"), description: "Failed to load chat", variant: "destructive" }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!userId) return
    fetchMessages()
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    try {
      const res = await authenticatedFetch(`/api/users/${userId}/internal-chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setMessages((prev) => [...prev, data.data])
        setInput("")
      } else {
        toast({ title: t("error"), description: data.error || "Failed to send", variant: "destructive" })
      }
    } catch {
      toast({ title: t("error"), description: "Failed to send", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  if (loading && !other) {
    return (
      <AppLayout title={t("internalChat")}>
        <div className="p-4 flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </AppLayout>
    )
  }

  if (!other) {
    return (
      <AppLayout title={t("internalChat")}>
        <div className="p-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("back")}
          </Button>
          <p className="text-muted-foreground mt-4">User not found.</p>
        </div>
      </AppLayout>
    )
  }

  const myId = currentUser?.id

  return (
    <AppLayout title={t("internalChatWith") + " " + other.name}>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[800px] border rounded-lg bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.push("/internal-chat")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{other.name}</p>
            <Badge
              variant={other.status === "ONLINE" ? "default" : other.status === "AWAY" ? "secondary" : "outline"}
              className="text-xs"
            >
              {other.status}
            </Badge>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">{t("noMessagesYet")}</p>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === myId
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    isMe ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {format(new Date(m.createdAt), "HH:mm")}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 p-3 border-t bg-background shrink-0">
          <Input
            placeholder={t("typeMessage")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={sending}
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
