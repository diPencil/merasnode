"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { useI18n } from "@/lib/i18n"
import { authenticatedFetch, getUser } from "@/lib/auth"
import { format, formatDistanceToNow } from "date-fns"
import { ArrowLeft, Send, User, MessageSquare, Paperclip } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface TeamMember {
  id: string
  name: string
  email: string
  status: "ONLINE" | "OFFLINE" | "AWAY"
  role: string
  lastLoginAt?: string | null
  lastLogoutAt?: string | null
  lastActivityAt?: string | null
  branches?: { id: string; name: string }[]
}

interface Message {
  id: string
  content: string
  mediaUrl?: string | null
  createdAt: string
  senderId: string
  sender: { id: string; name: string }
}

interface OtherUser {
  id: string
  name: string
  status: "ONLINE" | "OFFLINE" | "AWAY"
  role?: string
  lastLoginAt?: string | null
  lastLogoutAt?: string | null
  lastActivityAt?: string | null
  branches?: { id: string; name: string }[]
}

export default function InternalChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const { toast } = useToast()
  const currentUser = getUser()

  const withId = searchParams.get("with") || null

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(withId)
  const [messages, setMessages] = useState<Message[]>([])
  const [other, setOther] = useState<OtherUser | null>(null)
  const [loadingChat, setLoadingChat] = useState(false)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [branchFilterId, setBranchFilterId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const branchesFromMembers = (() => {
    const map = new Map<string, string>()
    teamMembers.forEach((u) => {
      u.branches?.forEach((b) => map.set(b.id, b.name))
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "ar"))
  })()

  const filteredMembers =
    branchFilterId == null
      ? teamMembers
      : teamMembers.filter((u) => u.branches?.some((b) => b.id === branchFilterId))

  // Sync selection from URL
  useEffect(() => {
    setSelectedId(withId)
  }, [withId])

  // Load team members (left column)
  useEffect(() => {
    let cancelled = false
    setLoadingList(true)
    authenticatedFetch("/api/internal-chat/team-members")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) setTeamMembers(data.data)
      })
      .finally(() => { if (!cancelled) setLoadingList(false) })
    return () => { cancelled = true }
  }, [])

  // Load messages when selection changes
  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      setOther(null)
      return
    }
    setLoadingChat(true)
    authenticatedFetch(`/api/users/${selectedId}/internal-chat/messages`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setMessages(data.data.messages || [])
          setOther(data.data.other || null)
        }
      })
      .catch(() => toast({ title: t("error"), description: "Failed to load chat", variant: "destructive" }))
      .finally(() => setLoadingChat(false))
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSelect = (id: string) => {
    setSelectedId(id)
    router.replace(`/internal-chat?with=${id}`, { scroll: false })
  }

  const handleBackToList = () => {
    setSelectedId(null)
    router.replace("/internal-chat", { scroll: false })
  }

  const handleSend = async () => {
    const content = input.trim()
    if (!content || sending || !selectedId) return
    setSending(true)
    try {
      const res = await authenticatedFetch(`/api/users/${selectedId}/internal-chat/messages`, {
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

  const myId = currentUser?.id
  const selectedMember = teamMembers.find((u) => u.id === selectedId)

  const getRoleLabel = (role: string) => {
    if (role === "ADMIN") return t("admin")
    if (role === "SUPERVISOR") return t("supervisor")
    if (role === "AGENT") return t("agentRole")
    return role
  }
  const getBranchLabel = (branches?: { id: string; name: string }[]) => {
    if (!branches?.length) return t("noBranchesAvailable")
    return branches.map((b) => b.name).join(", ")
  }

  const partner = other ?? selectedMember
  const lastSeenAt = partner?.lastActivityAt || partner?.lastLogoutAt
  const isOnline = (partner?.status ?? "OFFLINE") === "ONLINE"
  const AWAY_MS = 5 * 60 * 1000
  const isActiveNow =
    isOnline &&
    partner?.lastActivityAt &&
    Date.now() - new Date(partner.lastActivityAt).getTime() < AWAY_MS
  const lastSeenLabel = isActiveNow
    ? t("activeNow")
    : lastSeenAt
      ? `${t("lastSeen")} ${formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true })}`
      : null
  const loginAt = partner?.lastLoginAt ? new Date(partner.lastLoginAt).getTime() : null
  const logoutAt = partner?.lastLogoutAt ? new Date(partner.lastLogoutAt).getTime() : null
  const now = Date.now()
  let sessionLabel: string | null = null
  if (isOnline && loginAt) {
    const mins = Math.floor((now - loginAt) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    sessionLabel = h > 0 ? `${t("sessionTime")}: ${h}h ${m}m` : `${t("sessionTime")}: ${m}m`
  } else if (logoutAt && loginAt && logoutAt > loginAt) {
    const mins = Math.floor((logoutAt - loginAt) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    sessionLabel = `${t("lastSession")}: ${h > 0 ? `${h}h ` : ""}${m}m`
  }

  const baseUrl =
    (typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || window.location.origin)
      : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "")) || ""
  const getImageUrl = (url: string | undefined) => {
    if (!url) return ""
    const origin = typeof window !== "undefined" ? window.location.origin : baseUrl
    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        const u = new URL(url)
        if (origin && u.origin !== origin) return `${origin}${u.pathname}`
      } catch {
        /* ignore */
      }
      return url
    }
    return baseUrl ? `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}` : url
  }

  const handleAttachImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedId || sending) return
    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      toast({ title: t("error"), description: "JPEG, PNG, WebP only", variant: "destructive" })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("error"), description: "Max 5MB", variant: "destructive" })
      return
    }
    setSending(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await authenticatedFetch("/api/upload", { method: "POST", body: form })
      const data = await res.json()
      const mediaPath: string | undefined = data.path || data.url
      if (!data.success || !mediaPath) throw new Error(data.error || "Upload failed")
      const sendRes = await authenticatedFetch(`/api/users/${selectedId}/internal-chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "", mediaUrl: mediaPath }),
      })
      const sendData = await sendRes.json()
      if (sendData.success && sendData.data) {
        setMessages((prev) => [...prev, sendData.data])
      } else throw new Error(sendData.error)
    } catch (err) {
      toast({ title: t("error"), description: err instanceof Error ? err.message : "Failed", variant: "destructive" })
    } finally {
      setSending(false)
      e.target.value = ""
    }
  }

  return (
    <AppLayout title={t("internalChat")} fullBleed>
      <div className="flex h-full min-h-0 bg-card border rounded-lg overflow-hidden">
        {/* Left: team list (hidden on mobile when chat is open) */}
        <div
          className={cn(
            "flex flex-col shrink-0 border-e bg-muted/20 min-h-0",
            "w-full md:w-[280px] lg:w-[320px]",
            selectedId ? "hidden md:flex" : "flex"
          )}
        >
          <div className="p-3 border-b shrink-0 space-y-2">
            <h2 className="font-semibold text-sm">{t("internalChat")}</h2>
            <p className="text-xs text-muted-foreground">{t("internalChatConversations")}</p>
            {!loadingList && teamMembers.length > 0 && branchesFromMembers.length > 0 && (
              <Select
                value={branchFilterId ?? "__all__"}
                onValueChange={(v) => setBranchFilterId(v === "__all__" ? null : v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t("filterByBranch")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("allBranches")}</SelectItem>
                  {branchesFromMembers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {loadingList ? (
              <p className="p-4 text-sm text-muted-foreground">{t("loading")}</p>
            ) : teamMembers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>{t("noInternalConversations")}</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>{t("noMatchingBranches")}</p>
              </div>
            ) : (
              filteredMembers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelect(u.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors border-b border-border/40",
                    selectedId === u.id && "bg-primary/10 border-primary/20"
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {getRoleLabel(u.role)} · {getBranchLabel(u.branches)}
                    </p>
                  </div>
                  <Badge
                    variant={u.status === "ONLINE" ? "default" : u.status === "AWAY" ? "secondary" : "outline"}
                    className="shrink-0 text-[10px]"
                  >
                    {u.status}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: chat area (or placeholder) */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-6">
              <div className="text-center">
                <MessageSquare className="h-14 w-14 mx-auto mb-3 opacity-40" />
                <p className="text-sm">{t("noInternalConversations")}</p>
                <p className="text-xs mt-1">{t("internalChatConversations")}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-3 py-2.5 border-b bg-muted/30 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden shrink-0"
                  onClick={handleBackToList}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">
                    {other?.name ?? selectedMember?.name ?? selectedId}
                  </p>
                  <Badge
                    variant={
                      (other?.status ?? selectedMember?.status) === "ONLINE"
                        ? "default"
                        : (other?.status ?? selectedMember?.status) === "AWAY"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-xs mt-0.5"
                  >
                    {(other?.status ?? selectedMember?.status) ?? "OFFLINE"}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground truncate mt-1">
                    {getRoleLabel((other?.role ?? selectedMember?.role) ?? "")} · {getBranchLabel(other?.branches ?? selectedMember?.branches)}
                  </p>
                </div>
                {(lastSeenLabel || sessionLabel) && (
                  <div className="shrink-0 text-end text-xs text-muted-foreground">
                    {lastSeenLabel && <p>{lastSeenLabel}</p>}
                    {sessionLabel && <p className="mt-0.5">{sessionLabel}</p>}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {loadingChat ? (
                  <p className="text-sm text-muted-foreground">{t("loading")}</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">{t("noMessagesYet")}</p>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === myId
                    return (
                      <div
                        key={m.id}
                        className={cn("flex", isMe ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                            isMe
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {m.mediaUrl && (
                            <button
                              type="button"
                              onClick={() => setImagePreviewUrl(getImageUrl(m.mediaUrl))}
                              className="block rounded overflow-hidden my-1 bg-muted/50 text-start w-full"
                            >
                              <img
                                src={getImageUrl(m.mediaUrl)}
                                alt=""
                                className="max-w-full max-h-48 object-contain rounded cursor-pointer"
                                loading="lazy"
                              />
                            </button>
                          )}
                          {m.content ? (
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          ) : null}
                          <p
                            className={cn(
                              "text-[10px] mt-1",
                              isMe ? "text-primary-foreground/80" : "text-muted-foreground"
                            )}
                          >
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
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  id="internal-chat-attach"
                  onChange={handleAttachImage}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  disabled={sending}
                  onClick={() => document.getElementById("internal-chat-attach")?.click()}
                  title={t("attachImage")}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder={t("typeMessage")}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  disabled={sending}
                  className="min-w-0"
                />
                <Button size="icon" onClick={handleSend} disabled={!input.trim() || sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image preview in same page (no new tab) */}
      <Dialog open={!!imagePreviewUrl} onOpenChange={() => setImagePreviewUrl(null)}>
        <DialogContent className="max-w-[98vw] max-h-[95vh] p-0 gap-0 border-0 bg-black/90 flex items-center justify-center shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("attachImage")}</DialogTitle>
          </DialogHeader>
          {imagePreviewUrl && (
            <img
              src={imagePreviewUrl}
              alt=""
              className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
