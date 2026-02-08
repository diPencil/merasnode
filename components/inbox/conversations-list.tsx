"use client"

import { useState } from "react"
import { Search, Archive } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

interface ConversationsListProps {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  onSelectConversation: (conversation: Conversation) => void
}

export function ConversationsList({
  conversations,
  selectedConversation,
  onSelectConversation,
}: ConversationsListProps) {
  const [filter, setFilter] = useState<"all" | "unread" | "archived" | "blocked">("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filters = [
    { label: "All", value: "all" as const },
    { label: "Unread", value: "unread" as const },
    { label: "Archived", value: "archived" as const },
    { label: "Blocked", value: "blocked" as const },
  ]

  const filteredConversations = conversations.filter((conv) => {
    // Filter by status
    if (filter === "unread" && conv.unreadCount === 0) return false
    if (filter === "archived" && conv.status !== "archived") return false
    if (filter === "blocked" && conv.status !== "blocked") return false
    if (filter === "all" && conv.status !== "active") return false

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        conv.contact.name.toLowerCase().includes(query) ||
        conv.contact.phone.includes(query) ||
        conv.lastMessage.toLowerCase().includes(query)
      )
    }

    return true
  })

  return (
    <div className="flex h-full w-full flex-col">
      {/* Search Bar */}
      <div className="border-b border-border/50 bg-card/50 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-full bg-background/50 pl-10 shadow-soft"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border/50 bg-card/50 px-4 py-3">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter(f.value)}
            className={cn("rounded-full", filter === f.value && "bg-primary text-primary-foreground shadow-soft")}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Archive className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-4 text-sm">No conversations found</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={cn(
                  "w-full px-4 py-3 text-left transition-colors hover:bg-accent/50",
                  selectedConversation?.id === conversation.id && "bg-accent",
                )}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage
                      src={conversation.contact.avatar || "/placeholder.svg"}
                      alt={conversation.contact.name}
                    />
                    <AvatarFallback>
                      {conversation.contact.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-medium">{conversation.contact.name}</h3>
                      <span className="flex-shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(conversation.lastMessageTime, { addSuffix: false })}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-sm text-muted-foreground">{conversation.lastMessage}</p>

                    {/* Tags and Badges */}
                    <div className="mt-2 flex items-center gap-2">
                      {conversation.unreadCount > 0 && (
                        <Badge className="h-5 rounded-full bg-primary px-2 text-xs">{conversation.unreadCount}</Badge>
                      )}
                      {conversation.assignedAgent && (
                        <Badge variant="secondary" className="h-5 rounded-full px-2 text-xs">
                          {conversation.assignedAgent.name}
                        </Badge>
                      )}
                      {conversation.tags.slice(0, 1).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="h-5 rounded-full border-secondary/50 px-2 text-xs text-secondary"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
