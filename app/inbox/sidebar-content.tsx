"use client"

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, User, Building2, Tag, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { useI18n } from "@/lib/i18n"
import { authenticatedFetch, getUserRole } from "@/lib/auth"

const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
)

interface SidebarContentProps {
    conversation: any
    onUpdate: () => void
}

export function SidebarContent({ conversation, onUpdate }: SidebarContentProps) {
    const router = useRouter()
    const { t, language } = useI18n()
    const dateLocale = language === "ar" ? ar : undefined
    const [agents, setAgents] = useState<any[]>([])
    const [branches, setBranches] = useState<any[]>([])
    const [notes, setNotes] = useState<any[]>([])
    const [newNote, setNewNote] = useState("")
    const [isAddingNote, setIsAddingNote] = useState(false)
    const [loadingNotes, setLoadingNotes] = useState(false)

    // Tag Editing State
    const [isEditingTags, setIsEditingTags] = useState(false)
    const [tagInput, setTagInput] = useState("")

    // Group Members State
    const [participants, setParticipants] = useState<any[]>([])
    const [loadingParticipants, setLoadingParticipants] = useState(false)

    useEffect(() => {
        fetchAgents()
        fetchBranches()
    }, [])

    useEffect(() => {
        if (conversation?.contactId) {
            fetchNotes()
        }

        // Fetch group participants if it's a group
        if (conversation?.contact?.phone?.includes('@g.us')) {
            fetchGroupParticipants()
        } else {
            setParticipants([])
        }
    }, [conversation?.contactId, conversation?.contact?.phone])

    const fetchAgents = async () => {
        try {
            const res = await authenticatedFetch('/api/users/agents')
            const data = await res.json()
            if (data.success) setAgents(data.data)
        } catch (error) {
            console.error('Failed to fetch agents', error)
        }
    }

    const fetchBranches = async () => {
        try {
            const res = await authenticatedFetch('/api/branches')
            const data = await res.json()
            if (data.success) {
                setBranches(data.branches || [])
            }
        } catch (error) {
            console.error('Failed to fetch branches', error)
        }
    }

    const fetchNotes = async () => {
        setLoadingNotes(true)
        try {
            const res = await authenticatedFetch(`/api/contacts/${conversation.contactId}/notes`)
            const data = await res.json()
            if (data.success) setNotes(data.data)
        } catch (error) {
            console.error('Failed to fetch notes', error)
        } finally {
            setLoadingNotes(false)
        }
    }

    const fetchGroupParticipants = async () => {
        if (!conversation?.contact?.phone?.includes('@g.us') && (conversation?.contact?.phone?.length || 0) <= 15) return

        setLoadingParticipants(true)
        try {
            const groupId = conversation.contact.phone
            // accountId: من المحادثة أو من آخر رسالة (غالباً غير معيّن للمحادثات المجلوبة من السينك)
            const accountId = (conversation as any).whatsappAccountId
                || (conversation as any).messages?.[0]?.whatsappAccountId
                || null

            let resolvedAccountId = accountId
            if (!resolvedAccountId) {
                const accRes = await authenticatedFetch('/api/whatsapp/accounts')
                const accData = await accRes.json()
                if (accData.success && accData.accounts?.length > 0) {
                    const connected = accData.accounts.find((a: any) => a.status === 'CONNECTED')
                    if (connected) resolvedAccountId = connected.id
                }
            }

            if (!resolvedAccountId) {
                setParticipants([])
                return
            }

            const res = await authenticatedFetch(
                `/api/whatsapp/group?accountId=${encodeURIComponent(resolvedAccountId)}&groupId=${encodeURIComponent(groupId)}`
            )
            const data = await res.json()
            if (data.success && data.group?.participants) {
                setParticipants(data.group.participants)
            } else {
                setParticipants([])
            }
        } catch (error) {
            console.error('Failed to fetch group participants', error)
            setParticipants([])
        } finally {
            setLoadingParticipants(false)
        }
    }

    const handleCreatePrivateChat = async (phone: string) => {
        try {
            const res = await authenticatedFetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            })
            const data = await res.json()
            if (data.success) {
                // If it's a new conversation, we might need to refresh the list or navigate
                // But in Inbox page, we usually just want to select it.
                // Navigating to /inbox?id=... will trigger selection logic in page.tsx
                router.push(`/inbox?id=${data.data.id}`)
                onUpdate()
            }
        } catch (error) {
            console.error('Failed to create private chat', error)
        }
    }

    const handleAssignAgent = async (agentId: string) => {
        try {
            const res = await authenticatedFetch(`/api/conversations/${conversation.id}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId })
            })
            if (res.ok) {
                onUpdate()
            }
        } catch (error) {
            console.error('Failed to assign agent', error)
        }
    }

    const handleUpdateBranch = async (branchId: string) => {
        try {
            const res = await authenticatedFetch(`/api/contacts/${conversation.contactId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branchId })
            })
            if (res.ok) {
                onUpdate()
            }
        } catch (error) {
            console.error('Failed to update branch', error)
        }
    }

    const handleAddNote = async () => {
        if (!newNote.trim()) return

        try {
            const res = await authenticatedFetch(`/api/contacts/${conversation.contactId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newNote })
            })
            if (res.ok) {
                setNewNote("")
                setIsAddingNote(false)
                fetchNotes()
            }
        } catch (error) {
            console.error('Failed to add note', error)
        }
    }

    const handleUpdateTags = async () => {
        try {
            const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
            const res = await authenticatedFetch(`/api/contacts/${conversation.contactId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags })
            })
            if (res.ok) {
                setIsEditingTags(false)
                onUpdate()
            }
        } catch (error) {
            console.error('Failed to update tags', error)
        }
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    if (!conversation) return null

    const isAdmin = getUserRole() === "ADMIN"
    const branchName = conversation.contact.branchId
        ? (branches.find(b => b.id === conversation.contact.branchId)?.name ?? "-")
        : "-"
    const statusTag = conversation.contact.tags
        ? (Array.isArray(conversation.contact.tags) ? conversation.contact.tags[0] : String(conversation.contact.tags).split(",")[0]?.trim())
        : "Regular"
    const assignedAgentName = conversation.assignedToId
        ? (agents.find(a => a.id === conversation.assignedToId)?.name ?? (conversation as any).assignedTo?.name ?? t("unassigned"))
        : t("unassigned")

    const isGroup = conversation.contact.phone.includes("@g.us") || conversation.contact.phone.length > 15 || (conversation.contact as any).tags?.includes("group")

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Profile */}
            <div className="p-8 flex flex-col items-center text-center border-b">
                <Avatar className="h-24 w-24 mb-4 ring-4 ring-offset-2 ring-slate-50">
                    <AvatarFallback className="text-xl bg-slate-100 text-slate-500">
                        {getInitials(conversation.contact.name)}
                    </AvatarFallback>
                </Avatar>
                <h2 className="font-bold text-lg">{conversation.contact.name}</h2>
                <p className="text-sm text-muted-foreground">
                    {isGroup
                        ? t("whatsappGroup")
                        : conversation.contact.tags?.includes("whatsapp-contact")
                            ? t("whatsapp-contact") || "WhatsApp Contact"
                            : t("leadCustomer")}
                </p>

                <div className="flex flex-col gap-2 w-full mt-6">
                    <div className="bg-orange-50/50 p-2.5 rounded-md border border-orange-100 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">{t("branchLabel")}</span>
                        {isAdmin ? (
                            <Select onValueChange={handleUpdateBranch} value={conversation.contact.branchId || undefined}>
                                <SelectTrigger className="h-5 text-xs border-0 bg-transparent p-0 text-orange-700 font-bold w-auto focus:ring-0">
                                    <SelectValue placeholder={t("selectPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    {branches.map(branch => (
                                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <span className="text-xs font-bold text-orange-700">{branchName}</span>
                        )}
                    </div>
                    <div className="bg-purple-50/50 p-2.5 rounded-md border border-purple-100 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-purple-500 tracking-wider">{t("statusLabel")}</span>
                        {isAdmin ? (
                            <Select onValueChange={(val) => {
                                authenticatedFetch(`/api/contacts/${conversation.contactId}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ tags: [val] })
                                }).then(() => onUpdate())
                            }} value={conversation.contact.tags?.[0] || 'Regular'}>
                                <SelectTrigger className="h-5 text-xs border-0 bg-transparent p-0 text-purple-700 font-bold w-auto gap-1 focus:ring-0">
                                    <SelectValue placeholder={t("regular")} />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="Regular">{t("regular")}</SelectItem>
                                    <SelectItem value="VIP">{t("vip")} ⭐</SelectItem>
                                    <SelectItem value="New Lead">{t("newLead")}</SelectItem>
                                    <SelectItem value="Qualified">{t("qualified")}</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <span className="text-xs font-bold text-purple-700">{statusTag}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Details List */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-4">{t("contactInformation")}</h4>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Building2 className="h-4 w-4" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs text-muted-foreground">{t("metaId")}</p>
                                <p className="text-sm font-medium truncate">
                                    {conversation.contact.externalId && conversation.contact.externalId !== conversation.contact.phone
                                        ? conversation.contact.externalId
                                        : "-"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <Phone className="h-4 w-4" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs text-muted-foreground">{isGroup ? t("groupIdLabel") : t("phone")}</p>
                                <p className="text-sm font-medium truncate">
                                    {isGroup ? conversation.contact.phone.replace('@g.us', '') : (conversation.contact.phone || "-")}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <WhatsAppIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t("channel")}</p>
                                <p className="text-sm font-medium capitalize">{t("whatsApp")}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">{t("assignedAgent")}</p>
                                {isAdmin ? (
                                    <Select onValueChange={handleAssignAgent} value={conversation.assignedToId || undefined}>
                                        <SelectTrigger className="h-6 text-sm border-0 bg-transparent p-0 font-medium w-full justify-start">
                                            <SelectValue placeholder={t("unassigned")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">{t("unassigned")}</SelectItem>
                                            {agents.map(agent => (
                                                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm font-medium truncate">{assignedAgentName}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                                <Tag className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs text-muted-foreground">{t("tags")}</p>
                                    {isAdmin && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (!isEditingTags) {
                                                    const currentTags = conversation.contact.tags
                                                        ? (Array.isArray(conversation.contact.tags) ? conversation.contact.tags.join(', ') : conversation.contact.tags)
                                                        : ""
                                                    setTagInput(String(currentTags))
                                                }
                                                setIsEditingTags(!isEditingTags)
                                            }}
                                            className="h-auto p-0 text-[10px] text-primary"
                                        >
                                            {isEditingTags ? t("cancel") : t("edit")}
                                        </Button>
                                    )}
                                </div>

                                {isAdmin && isEditingTags ? (
                                    <div className="space-y-2">
                                        <Input
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            placeholder={t("tagsPlaceholder")}
                                            className="h-7 text-xs"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleUpdateTags()
                                                }
                                            }}
                                        />
                                        <Button size="sm" onClick={handleUpdateTags} className="w-full h-6 text-[10px]">
                                            {t("saveTags")}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {conversation.contact.tags ? (
                                            (Array.isArray(conversation.contact.tags) ? conversation.contact.tags : String(conversation.contact.tags).split(',')).map((tag: string) => (
                                                <Badge key={tag} variant="secondary" className="rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200 px-2 py-0.5 font-normal">
                                                    {tag.trim()}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm font-medium text-muted-foreground">-</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>


                <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center justify-between">
                        {t("recentNotes")}
                        <Button variant="ghost" size="sm" onClick={() => setIsAddingNote(!isAddingNote)} className="h-auto p-0 text-xs text-primary">
                            {isAddingNote ? t("cancel") : t("addLabel")}
                        </Button>
                    </h4>

                    {isAddingNote && (
                        <div className="mb-3 space-y-2">
                            <Textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder={t("writeNotePlaceholder")}
                                className="text-xs min-h-[80px]"
                            />
                            <Button size="sm" onClick={handleAddNote} className="w-full text-xs" disabled={!newNote.trim()}>
                                {t("saveNote")}
                            </Button>
                        </div>
                    )}

                    <div className="space-y-3">
                        {loadingNotes ? (
                            <p className="text-xs text-muted-foreground text-center py-2">{t("loadingNotes")}</p>
                        ) : notes.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2 bg-slate-50 rounded">{t("noNotesYet")}</p>
                        ) : (
                            notes.map(note => (
                                <div key={note.id} className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-3">
                                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                        {note.content}
                                    </p>
                                    <div className="mt-2 text-[10px] text-slate-400 text-end flex justify-between">
                                        <span>{note.creator?.name || t("systemLabel")}</span>
                                        <span>{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: dateLocale })}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Group Participants Section */}
                {conversation?.contact?.phone?.includes('@g.us') && (
                    <div className="mt-6 pt-6 border-t">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-4 flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {t("groupParticipants")}
                            <Badge variant="secondary" className="ms-auto h-5 px-1.5 text-[10px] font-bold bg-slate-100 text-slate-500">
                                {participants.length}
                            </Badge>
                        </h4>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pe-2">
                            {loadingParticipants ? (
                                <p className="text-xs text-muted-foreground text-center py-2">{t("loading")}</p>
                            ) : participants.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2 bg-slate-50 rounded">{t("noParticipantsFound")}</p>
                            ) : (
                                participants.map((p: any) => (
                                    <div key={p.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Avatar className="h-7 w-7 border">
                                                <AvatarFallback className="text-[10px] bg-slate-50">
                                                    {p.phone.slice(-2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="truncate">
                                                <p className="text-xs font-medium truncate">
                                                    +{p.phone}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {p.isAdmin && (
                                                <Badge variant="outline" className="h-4 px-1 text-[8px] font-bold text-green-600 border-green-200 bg-green-50 shrink-0">
                                                    {t("groupAdmin")}
                                                </Badge>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-primary hover:bg-primary/10 rounded-full"
                                                onClick={() => handleCreatePrivateChat(p.phone)}
                                                title={t("sendMessageLabel")}
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
