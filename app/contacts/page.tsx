"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { Search, Plus, MoreVertical, Mail, Phone, Tag, Download, Upload, ShieldOff, Users } from "lucide-react"
import { authenticatedFetch, getUserRole } from "@/lib/auth"

interface Contact {
  id: string
  name: string
  phone: string
  email?: string | null
  avatar?: string | null
  tags: string | null
  notes?: string | null
  createdAt: string
}

export default function ContactsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t, language, dir } = useI18n()
  const dateLocale = language === "ar" ? ar : undefined
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"all" | "blocked">("all")

  // Add Contact Dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    email: "",
    tags: "",
    notes: ""
  })

  // Delete Confirmation Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<string | null>(null)

  // Block/Unblock Confirmation Dialog
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)
  const [contactToToggle, setContactToToggle] = useState<Contact | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Define fetchContacts early so it's available for other handlers
  const fetchContacts = async () => {
    try {
      setIsLoading(true)
      const response = await authenticatedFetch('/api/contacts')
      const data = await response.json()

      if (data.success) {
        setContacts(data.data)
      } else {
        setError(data.error || 'Failed to fetch contacts')
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Error fetching contacts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Edit Contact Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editContact, setEditContact] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
    tags: "",
    notes: ""
  })


  const handleExport = () => {
    if (contacts.length === 0) {
      toast({
        title: t("noData"),
        description: t("noContactsToExport"),
        variant: "destructive"
      })
      return
    }

    const headers = [t("nameLabel"), t("phone"), t("email"), t("tags"), t("notes")]
    const csvContent = [
      headers.join(','),
      ...contacts.map(contact => [
        `"${contact.name}"`,
        `"${contact.phone}"`,
        `"${contact.email || ''}"`,
        `"${Array.isArray(contact.tags) ? contact.tags.join(';') : (contact.tags || '')}"`,
        `"${contact.notes || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: t("exportSuccessful"),
      description: t("contactsExportedToCsv"),
    })
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n')
        const headers = lines[0].split(',')

        // Basic CSV parsing (assuming simple format)
        const parsedContacts = lines.slice(1)
          .filter(line => line.trim() !== '')
          .map(line => {
            // Handle quotes if needed, simplified for now
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''))

            // Map values based on expected order: Name, Phone, Email, Tags, Notes
            // Or verify headers, but assuming standard format for now
            const [name, phone, email, tags, notes] = values

            return {
              name,
              phone: phone?.replace(/[^0-9+]/g, ''),
              email,
              tags: tags ? tags.split(';').map(t => t.trim()) : [],
              notes
            }
          })
          .filter(c => c.name && c.phone) // Ensure required fields

        if (parsedContacts.length === 0) {
          toast({
            title: t("importError"),
            description: t("noValidContactsInCsv"),
            variant: "destructive"
          })
          return
        }

        setIsLoading(true)
        const response = await authenticatedFetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedContacts)
        })

        const data = await response.json()

        if (data.success) {
          fetchContacts()
          toast({
            title: t("importSuccessful"),
            description: data.message || `${t("importedCount")} ${parsedContacts.length}`
          })
        } else {
          toast({
            title: t("importError"),
            description: data.error || t("failedToImportContacts"),
            variant: "destructive"
          })
        }
      } catch (err) {
        console.error('Error parsing CSV:', err)
        toast({
          title: t("importFailed"),
          description: t("couldNotParseCsv"),
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  const handleSendMessage = async (contactId: string) => {
    // ... existing logic ...
    try {
      const response = await authenticatedFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId })
      })

      const data = await response.json()

      if (data.success) {
        router.push(`/inbox?conversation=${data.data.id}`)
      } else {
        toast({
          title: t("error"),
          description: data.error || t("failedToCreateConversation"),
          variant: "destructive"
        })
      }
    } catch (err) {
      // ... err handling
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    try {
      const response = await authenticatedFetch(`/api/contacts/${contactId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setContacts(contacts.filter(c => c.id !== contactId))
        setSelectedContact(null)
        setIsDeleteDialogOpen(false)
        setContactToDelete(null)
        toast({
          title: t("success"),
          description: t("contactDeletedSuccessfully")
        })
      } else {
        toast({
          title: t("error"),
          description: data.error || t("failedToDeleteContact"),
          variant: "destructive"
        })
      }
    } catch (err) {
      toast({
        title: t("error"),
        description: t("failedToConnectToServer"),
        variant: "destructive"
      })
      console.error('Error deleting contact:', err)
    }
  }

  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editContact.name || !editContact.phone) {
      toast({
        title: t("validationError"),
        description: t("nameAndPhoneRequired"),
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Handle tags - could be string or array
      const tagsArray = editContact.tags
        ? (Array.isArray(editContact.tags)
          ? editContact.tags
          : editContact.tags.split(',').map(t => t.trim()))
        : [];

      const response = await authenticatedFetch(`/api/contacts/${editContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editContact.name,
          phone: editContact.phone,
          email: editContact.email || null,
          tags: tagsArray,
          notes: editContact.notes || null
        })
      })

      const data = await response.json()

      if (data.success) {
        setContacts(contacts.map(c => c.id === editContact.id ? data.data : c))
        setSelectedContact(data.data)
        setIsEditDialogOpen(false)
        toast({
          title: t("success"),
          description: t("contactUpdatedSuccessfully")
        })
      } else {
        toast({
          title: t("error"),
          description: data.error || t("failedToUpdateContact"),
          variant: "destructive"
        })
      }
    } catch (err) {
      toast({
        title: t("error"),
        description: t("failedToConnectToServer"),
        variant: "destructive"
      })
      console.error('Error updating contact:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleBlock = (contact: Contact) => {
    setContactToToggle(contact)
    setIsBlockDialogOpen(true)
  }

  const confirmToggleBlock = async () => {
    if (!contactToToggle) return

    const contact = contactToToggle
    try {
      // Parse current tags
      const currentTags = contact.tags
        ? (Array.isArray(contact.tags) ? contact.tags : String(contact.tags).split(',').map(t => t.trim()))
        : []

      const isBlocked = currentTags.includes('blocked')
      const newTags = isBlocked
        ? currentTags.filter(t => t !== 'blocked')
        : [...currentTags, 'blocked']

      setIsSubmitting(true)
      const response = await authenticatedFetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contact.name,
          phone: contact.phone,
          email: contact.email || null,
          notes: contact.notes || null,
          tags: newTags
        })
      })

      const data = await response.json()

      if (data.success) {
        setContacts(contacts.map(c => c.id === contact.id ? data.data : c))
        if (selectedContact?.id === contact.id) {
          setSelectedContact(data.data)
        }
        toast({
          title: t("success"),
          description: isBlocked ? t("contactUnblocked") : t("contactBlockedSuccess")
        })
      } else {
        toast({
          title: t("error"),
          description: data.error || t("failedToUpdateContact"),
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error('Error toggling block:', err)
      toast({
        title: t("error"),
        description: t("failedToConnectToServer"),
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
      setIsBlockDialogOpen(false)
      setContactToToggle(null)
    }
  }


  // جلب جهات الاتصال من API
  useEffect(() => {
    fetchContacts()
  }, [])



  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newContact.name || !newContact.phone) {
      toast({
        title: t("validationError"),
        description: t("nameAndPhoneRequired"),
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await authenticatedFetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContact.name,
          phone: newContact.phone,
          email: newContact.email || null,
          tags: newContact.tags ? newContact.tags.split(',').map(t => t.trim()) : [],
          notes: newContact.notes || null
        })
      })

      const data = await response.json()

      if (data.success) {
        setContacts([...contacts, data.data])
        setIsAddDialogOpen(false)
        setNewContact({ name: "", phone: "", email: "", tags: "", notes: "" })
        toast({
          title: t("success"),
          description: t("contactAddedSuccessfully")
        })
      } else {
        toast({
          title: t("error"),
          description: data.error || t("failedToAddContact"),
          variant: "destructive"
        })
      }
    } catch (err) {
      toast({
        title: t("error"),
        description: t("failedToConnectToServer"),
        variant: "destructive"
      })
      console.error('Error adding contact:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = contact.name.toLowerCase().includes(query) ||
      contact.phone.includes(query) ||
      contact.email?.toLowerCase().includes(query)

    if (!matchesSearch) return false

    if (viewMode === 'blocked') {
      const isBlocked = contact.tags
        ? (Array.isArray(contact.tags) ? contact.tags : String(contact.tags).split(',').map(t => t.trim())).includes('blocked')
        : false
      return isBlocked
    }

    return true
  })

  return (
    <AppLayout title={t("contacts")}>
      <div className="space-y-6">
        {/* Header Actions */}
        {/* Header Actions */}
        <div className="flex flex-col gap-4">
          {/* Top Row: Title + Badge + Mobile Add Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                {viewMode === 'all' ? t("yourContacts") : t("blockedContacts")}
              </h2>
              <Badge variant="outline" className="text-xs md:text-sm px-2 py-0.5 h-6 md:h-7">
                {viewMode === 'all' ? t("total") : t("blocked")}: {filteredContacts.length}
              </Badge>
            </div>
            {/* Mobile: Add Contact Button (Icon Only) */}
            <Button size="icon" className="h-8 w-8 md:hidden shrink-0 rounded-full" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Controls Row */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search - Full width on mobile */}
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("searchContacts")}
                className="ps-9 h-10 md:h-9 w-full bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Actions Row — Blocked / Import / Export only for Admin */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {getUserRole() === "ADMIN" && (
                <>
                  <Button
                    variant={viewMode === "blocked" ? "default" : "outline"}
                    size="sm"
                    className={`h-9 gap-2 shrink-0 ${viewMode === "blocked" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-card"}`}
                    onClick={() => setViewMode(viewMode === "all" ? "blocked" : "all")}
                  >
                    {viewMode === "all" ? <ShieldOff className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    <span className="hidden lg:inline">{viewMode === "all" ? t("blockedContactsLabel") : t("allContactsLabel")}</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 gap-2 shrink-0 bg-card" onClick={handleImport}>
                    <Upload className="h-4 w-4" />
                    <span className="hidden lg:inline">{t("importLabel")}</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 gap-2 shrink-0 bg-card" onClick={handleExport}>
                    <Download className="h-4 w-4" />
                    <span className="hidden lg:inline">{t("exportLabel")}</span>
                  </Button>
                </>
              )}

              {/* Desktop Add Button */}
              <Button size="sm" className="h-9 hidden md:flex shrink-0" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="me-2 h-4 w-4" />
                {t("addContact")}
              </Button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>
        </div>
        {/* Contacts Table */}
        <div className="rounded-2xl bg-card shadow-soft">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="mt-4 text-sm text-muted-foreground">{t("loadingContacts")}</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-destructive">{error}</p>
                <Button onClick={fetchContacts} variant="outline" className="mt-4">
                  {t("tryAgain")}
                </Button>
              </div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? t("noContactsMatchingSearch")
                  : viewMode === 'blocked'
                    ? t("noBlockedContactsFound")
                    : t("noContactsYetAddFirst")}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: Card list */}
              <div className="md:hidden space-y-3 p-4">
                {filteredContacts.map((contact) => {
                  const isBlocked = contact.tags
                    ? (Array.isArray(contact.tags) ? contact.tags : String(contact.tags).split(",").map((t) => t.trim())).includes("blocked")
                    : false
                  return (
                    <div
                      key={contact.id}
                      className={`rounded-xl border bg-card p-4 cursor-pointer active:bg-accent/50 ${isBlocked ? "border-red-200 dark:border-red-900/50" : ""}`}
                      onClick={() => setSelectedContact(contact)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 shrink-0">
                          <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                          <AvatarFallback>
                            {contact.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{contact.name}</p>
                            {isBlocked && (
                              <Badge variant="destructive" className="text-[10px] h-5">
                                {t("blockedBadge")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{contact.phone}</p>
                          {contact.email && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{contact.email}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" className="mt-3 w-full min-h-[44px]">
                            <MoreVertical className="h-4 w-4 me-2" />
                            {t("actionsLabel")}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedContact(contact) }}>
                            {t("viewDetails")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendMessage(contact.id) }}>
                            {t("sendMessageLabel")}
                          </DropdownMenuItem>
                          {getUserRole() === "ADMIN" && (
                            <>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                setEditContact({
                                  id: contact.id,
                                  name: contact.name,
                                  phone: contact.phone,
                                  email: contact.email || "",
                                  tags: Array.isArray(contact.tags) ? contact.tags.join(", ") : (contact.tags || ""),
                                  notes: contact.notes || ""
                                })
                                setIsEditDialogOpen(true)
                              }}>
                                {t("editContactLabel")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleBlock(contact) }}>
                                {isBlocked ? t("unblockContactLabel") : t("blockContactLabel")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); setContactToDelete(contact.id); setIsDeleteDialogOpen(true) }}
                              >
                                {t("delete")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                })}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>{t("contactLabel")}</TableHead>
                      <TableHead>{t("phone")}</TableHead>
                      <TableHead>{t("email")}</TableHead>
                      <TableHead>{t("tags")}</TableHead>
                      <TableHead>{t("createdLabel")}</TableHead>
                      <TableHead className="text-end w-[100px]">{t("actionsLabel")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact, index) => {
                      const isBlocked = contact.tags
                        ? (Array.isArray(contact.tags) ? contact.tags : String(contact.tags).split(',').map(t => t.trim())).includes('blocked')
                        : false;

                      return (
                        <TableRow
                          key={contact.id}
                          className={`cursor-pointer border-border/30 hover:bg-accent/50 ${isBlocked ? 'bg-red-50/50 hover:bg-red-100/50 dark:bg-red-950/20' : ''}`}
                          onClick={() => setSelectedContact(contact)}
                        >
                          <TableCell className="text-muted-foreground font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                                <AvatarFallback>
                                  {contact.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium">{contact.name}</span>
                                {isBlocked && <Badge variant="destructive" className="ms-2 text-[10px] h-5">{t("blockedBadge")}</Badge>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{contact.phone}</TableCell>
                          <TableCell className="text-muted-foreground">{contact.email || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {contact.tags ? (
                                <>
                                  {(() => {
                                    // Handle both string and array formats
                                    const tagsArray: string[] = Array.isArray(contact.tags)
                                      ? contact.tags
                                      : String(contact.tags).split(',').map(t => t.trim());

                                    return (
                                      <>
                                        {tagsArray.slice(0, 2).map((tag: string, index: number) => (
                                          <Badge key={index} variant={tag === 'blocked' ? 'destructive' : 'secondary'} className="rounded-full">
                                            {tag.trim()}
                                          </Badge>
                                        ))}
                                        {tagsArray.length > 2 && (
                                          <Badge variant="outline" className="rounded-full">
                                            +{tagsArray.length - 2}
                                          </Badge>
                                        )}
                                      </>
                                    );
                                  })()}
                                </>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{format(new Date(contact.createdAt), "MMM dd, yyyy", { locale: dateLocale })}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl shadow-soft-lg">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedContact(contact)
                                }}>
                                  {t("viewDetails")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  handleSendMessage(contact.id)
                                }}>
                                  {t("sendMessageLabel")}
                                </DropdownMenuItem>
                                {getUserRole() === "ADMIN" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation()
                                      setEditContact({
                                        id: contact.id,
                                        name: contact.name,
                                        phone: contact.phone,
                                        email: contact.email || "",
                                        tags: Array.isArray(contact.tags) ? contact.tags.join(", ") : (contact.tags || ""),
                                        notes: contact.notes || ""
                                      })
                                      setIsEditDialogOpen(true)
                                    }}>
                                      {t("editContactLabel")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className={isBlocked ? "text-green-600" : "text-amber-600"}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggleBlock(contact)
                                      }}
                                    >
                                      {isBlocked ? t("unblockContactLabel") : t("blockContactLabel")}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setContactToDelete(contact.id)
                                        setIsDeleteDialogOpen(true)
                                      }}
                                    >
                                      {t("delete")}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contact Details Drawer */}
      < Sheet open={!!selectedContact
      } onOpenChange={() => setSelectedContact(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedContact && (
            <>
              <SheetHeader>
                <SheetTitle>{t("contactDetailsTitle")}</SheetTitle>
                <SheetDescription>{t("viewAndManageContact")}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="text-center">
                  <Avatar className="mx-auto h-24 w-24 shadow-soft-lg">
                    <AvatarImage src={selectedContact.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="text-2xl">
                      {selectedContact.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="mt-4 text-xl font-semibold">{selectedContact.name}</h3>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl bg-muted/50 p-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedContact.phone}</span>
                    </div>
                    {selectedContact.email && (
                      <div className="mt-3 flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedContact.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-muted/50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Tag className="h-4 w-4" />
                      {t("tags")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedContact.tags ? (
                        (Array.isArray(selectedContact.tags) ? selectedContact.tags : String(selectedContact.tags).split(',')).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="rounded-full">
                            {tag.trim()}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">{t("noTags")}</span>
                      )}
                    </div>
                  </div>

                  {selectedContact.notes && (
                    <div className="rounded-xl bg-muted/50 p-4">
                      <div className="mb-2 text-sm font-medium">{t("notes")}</div>
                      <p className="text-sm text-muted-foreground">{selectedContact.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 rounded-full"
                    onClick={() => selectedContact && handleSendMessage(selectedContact.id)}
                  >
                    {t("sendMessageButton")}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full bg-transparent"
                    onClick={() => {
                      if (selectedContact) {
                        setEditContact({
                          id: selectedContact.id,
                          name: selectedContact.name,
                          phone: selectedContact.phone,
                          email: selectedContact.email || "",
                          tags: Array.isArray(selectedContact.tags) ? selectedContact.tags.join(', ') : (selectedContact.tags || ""),
                          notes: selectedContact.notes || ""
                        })
                        setIsEditDialogOpen(true)
                        setSelectedContact(null)
                      }
                    }}
                  >
                    {t("edit")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet >

      {/* Add Contact Dialog */}
      < Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addNewContact")}</DialogTitle>
            <DialogDescription>{t("addNewContactDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddContact}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("nameRequired")}</Label>
                <Input
                  id="name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder={t("placeholderName")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("phoneRequired")}</Label>
                <Input
                  id="phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder={t("placeholderPhone")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder={t("placeholderEmailExample")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">{t("tagsCommaSeparated")}</Label>
                <Input
                  id="tags"
                  value={newContact.tags}
                  onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })}
                  placeholder={t("placeholderTags")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">{t("notes")}</Label>
                <Input
                  id="notes"
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  placeholder={t("additionalNotes")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("adding") : t("addContact")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog >

      {/* Edit Contact Dialog */}
      < Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editContactTitle")}</DialogTitle>
            <DialogDescription>{t("updateContactInfo")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditContact}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t("nameRequired")}</Label>
                <Input
                  id="edit-name"
                  value={editContact.name}
                  onChange={(e) => setEditContact({ ...editContact, name: e.target.value })}
                  placeholder={t("placeholderName")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">{t("phoneRequired")}</Label>
                <Input
                  id="edit-phone"
                  value={editContact.phone}
                  onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })}
                  placeholder={t("placeholderPhone")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">{t("email")}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editContact.email}
                  onChange={(e) => setEditContact({ ...editContact, email: e.target.value })}
                  placeholder={t("placeholderEmailExample")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tags">{t("tagsCommaSeparated")}</Label>
                <Input
                  id="edit-tags"
                  value={editContact.tags}
                  onChange={(e) => setEditContact({ ...editContact, tags: e.target.value })}
                  placeholder={t("placeholderTags")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">{t("notes")}</Label>
                <Input
                  id="edit-notes"
                  value={editContact.notes}
                  onChange={(e) => setEditContact({ ...editContact, notes: e.target.value })}
                  placeholder={t("additionalNotes")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("updating") : t("updateContact")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog >

      {/* Delete Confirmation Dialog */}
      < Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteContactTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteContactConfirmDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setContactToDelete(null)
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => contactToDelete && handleDeleteContact(contactToDelete)}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Block Confirmation Dialog */}
      <AlertDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-border bg-card shadow-soft-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              {contactToToggle?.tags?.includes('blocked') ? 'Unblock Contact' : 'Block Contact'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to {contactToToggle?.tags?.includes('blocked') ? 'unblock' : 'block'} <strong>{contactToToggle?.name}</strong>?
              {contactToToggle?.tags?.includes('blocked')
                ? ' They will be able to message you again.'
                : ' You will not receive any more messages from this contact.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-border bg-transparent hover:bg-accent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={`rounded-full ${contactToToggle?.tags?.includes('blocked') ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white shadow-lg`}
              onClick={confirmToggleBlock}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : (contactToToggle?.tags?.includes('blocked') ? 'Unblock' : 'Block')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout >
  )
}
