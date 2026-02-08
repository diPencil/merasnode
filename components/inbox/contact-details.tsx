"use client"

import { useState } from "react"
import { Mail, Phone, Calendar, Tag, Edit, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { Contact } from "@/lib/types"
import { format } from "date-fns"

interface ContactDetailsProps {
  contact: Contact
}

export function ContactDetails({ contact }: ContactDetailsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [notes, setNotes] = useState(contact.notes || "")
  const [followUpDate, setFollowUpDate] = useState(
    contact.followUpDate ? format(contact.followUpDate, "yyyy-MM-dd") : "",
  )

  const handleSave = () => {
    setIsEditing(false)
    // In a real app, save to backend
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Contact Header */}
      <div className="mb-6 text-center">
        <Avatar className="mx-auto h-24 w-24 shadow-soft-lg">
          <AvatarImage src={contact.avatar || "/placeholder.svg"} alt={contact.name} />
          <AvatarFallback className="text-2xl">
            {contact.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <h2 className="mt-4 text-xl font-semibold">{contact.name}</h2>
      </div>

      {/* Contact Info */}
      <div className="space-y-4">
        <div className="rounded-xl bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{contact.phone}</span>
          </div>
          {contact.email && (
            <div className="mt-3 flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{contact.email}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="rounded-xl bg-card p-4 shadow-soft">
          <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Tag className="h-4 w-4" />
            Tags
          </Label>
          <div className="flex flex-wrap gap-2">
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full">
                {tag}
              </Badge>
            ))}
            <Button variant="outline" size="sm" className="h-6 rounded-full px-2 text-xs bg-transparent">
              + Add
            </Button>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl bg-card p-4 shadow-soft">
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-medium">Notes</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              className="h-8 rounded-full"
            >
              {isEditing ? (
                <>
                  <Save className="mr-1 h-3 w-3" />
                  Save
                </>
              ) : (
                <>
                  <Edit className="mr-1 h-3 w-3" />
                  Edit
                </>
              )}
            </Button>
          </div>
          {isEditing ? (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this contact..."
              className="min-h-24 rounded-lg"
            />
          ) : (
            <p className="text-sm text-muted-foreground">{notes || "No notes yet"}</p>
          )}
        </div>

        {/* Follow-up Date */}
        <div className="rounded-xl bg-card p-4 shadow-soft">
          <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Follow-up Date
          </Label>
          {isEditing ? (
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="rounded-lg"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {followUpDate ? format(new Date(followUpDate), "MMM dd, yyyy") : "Not set"}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
