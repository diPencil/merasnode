"use client"

import { useState } from "react"
import {
  ArrowLeft,
  MoreVertical,
  Archive,
  Ban,
  UserPlus,
  Info,
  Paperclip,
  Smile,
  Send,
  FileText,
  Check,
  CheckCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Conversation, Message, MessageStatus } from "@/lib/types"
import { format } from "date-fns"

interface ChatPanelProps {
  conversation: Conversation
  onBack: () => void
  onToggleDetails: () => void
}

export function ChatPanel({ conversation, onBack, onToggleDetails }: ChatPanelProps) {
  const [messageInput, setMessageInput] = useState("")
  const [messages, setMessages] = useState<Message[]>(conversation.messages)

  const handleSendMessage = () => {
    if (!messageInput.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId: conversation.id,
      content: messageInput,
      type: "text",
      direction: "outbound",
      status: "sending",
      timestamp: new Date(),
    }

    setMessages([...messages, newMessage])
    setMessageInput("")

    // Simulate message status updates
    setTimeout(() => {
      setMessages((prev) => prev.map((msg) => (msg.id === newMessage.id ? { ...msg, status: "sent" } : msg)))
    }, 500)

    setTimeout(() => {
      setMessages((prev) => prev.map((msg) => (msg.id === newMessage.id ? { ...msg, status: "delivered" } : msg)))
    }, 1500)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-border/50 bg-card/50 px-4 py-3 shadow-soft">
        <div className="flex items-center gap-3">
          {/* Mobile Back Button */}
          <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.contact.avatar || "/placeholder.svg"} alt={conversation.contact.name} />
            <AvatarFallback>
              {conversation.contact.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>

          <div>
            <h2 className="font-semibold">{conversation.contact.name}</h2>
            <p className="text-xs text-muted-foreground">{conversation.contact.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onToggleDetails} className="rounded-full">
            <Info className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl shadow-soft-lg">
              <DropdownMenuItem>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign to agent
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="mr-2 h-4 w-4" />
                Archive conversation
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Ban className="mr-2 h-4 w-4" />
                Block contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-linear-to-b from-background/50 to-background p-4">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const showTimestamp =
              index === 0 || format(messages[index - 1].timestamp, "HH:mm") !== format(message.timestamp, "HH:mm")

            return (
              <div key={message.id}>
                {/* Timestamp Divider */}
                {showTimestamp && (
                  <div className="mb-4 flex items-center justify-center">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {format(message.timestamp, "HH:mm")}
                    </span>
                  </div>
                )}

                {/* Message Bubble: fit-content, responsive max-width, no clipping */}
                <div className={cn("flex w-full", message.direction === "outbound" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "w-fit max-w-[85%] md:max-w-[70%] min-w-0 rounded-2xl px-4 py-2 shadow-soft",
                      "wrap-break-word overflow-visible whitespace-pre-wrap",
                      message.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-card",
                    )}
                  >
                    <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">{message.content}</p>

                    {/* Status Icons (outbound only) */}
                    {message.direction === "outbound" && (
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <MessageStatusIcon status={message.status} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Message Composer */}
      <div className="border-t border-border/50 bg-card/50 p-4 shadow-soft">
        <div className="flex items-end gap-2">
          {/* Attachment Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                <Paperclip className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" className="rounded-xl shadow-soft-lg">
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                Document
              </DropdownMenuItem>
              <DropdownMenuItem>Image</DropdownMenuItem>
              <DropdownMenuItem>Video</DropdownMenuItem>
              <DropdownMenuItem>Audio</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Message Input */}
          <div className="relative flex-1">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Type a message..."
              className="rounded-full bg-background pe-10 shadow-soft"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute end-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>

          {/* Template Button */}
          <Button variant="ghost" size="icon" className="rounded-full shrink-0">
            <FileText className="h-5 w-5" />
          </Button>

          {/* Send Button */}
          <Button onClick={handleSendMessage} disabled={!messageInput.trim()} className="h-10 w-10 rounded-full p-0">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function MessageStatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case "sending":
      return <div className="h-3 w-3 animate-pulse rounded-full bg-current opacity-50" />
    case "sent":
      return <Check className="h-3 w-3 opacity-70" />
    case "delivered":
      return <CheckCheck className="h-3 w-3 opacity-70" />
    case "read":
      return <CheckCheck className="h-3 w-3 text-secondary" />
    case "failed":
      return <span className="text-xs text-destructive">!</span>
    default:
      return null
  }
}
