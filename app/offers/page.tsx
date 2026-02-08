"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Tag, Calendar, Send, Edit, Trash2, Users, CheckSquare } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Offer {
    id: string
    title: string
    description?: string
    content: string
    validFrom: string
    validTo: string
    isActive: boolean
    createdAt: string
}

interface Contact {
    id: string
    name: string
    phone: string
    email?: string
}

export default function OffersPage() {
    const { t } = useI18n()
    const { toast } = useToast()
    const [offers, setOffers] = useState<Offer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        content: "",
        validFrom: "",
        validTo: "",
        isActive: true,
    })
    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
    const [contacts, setContacts] = useState<Contact[]>([])
    const [selectedContactId, setSelectedContactId] = useState("")
    const [sendMode, setSendMode] = useState<"single" | "bulk">("single")
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])

    useEffect(() => {
        fetchOffers()
        fetchContacts()
    }, [])

    const fetchOffers = async () => {
        try {
            setIsLoading(true)
            const response = await fetch("/api/offers")
            const data = await response.json()
            if (data.success) {
                setOffers(data.offers)
            }
        } catch (error) {
            console.error("Error fetching offers:", error)
            toast({
                title: "Error",
                description: "Failed to load offers",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const fetchContacts = async () => {
        try {
            const response = await fetch("/api/contacts")
            const data = await response.json()
            if (data.success) {
                setContacts(data.data || [])
            } else {
                console.error("Failed to fetch contacts:", data.error)
                setContacts([])
            }
        } catch (error) {
            console.error("Error fetching contacts:", error)
            setContacts([])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingOffer ? `/api/offers/${editingOffer.id}` : "/api/offers"
            const method = editingOffer ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            const data = await response.json()
            if (data.success) {
                toast({
                    title: "Success",
                    description: editingOffer ? "Offer updated successfully" : "Offer created successfully",
                })
                setIsDialogOpen(false)
                resetForm()
                fetchOffers()
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to save offer",
                variant: "destructive",
            })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this offer?")) return

        try {
            const response = await fetch(`/api/offers/${id}`, { method: "DELETE" })
            const data = await response.json()
            if (data.success) {
                toast({
                    title: "Success",
                    description: "Offer deleted successfully",
                })
                fetchOffers()
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete offer",
                variant: "destructive",
            })
        }
    }

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            content: "",
            validFrom: "",
            validTo: "",
            isActive: true,
        })
        setEditingOffer(null)
    }

    const openEditDialog = (offer: Offer) => {
        setEditingOffer(offer)
        setFormData({
            title: offer.title,
            description: offer.description || "",
            content: offer.content,
            validFrom: offer.validFrom.split("T")[0],
            validTo: offer.validTo.split("T")[0],
            isActive: offer.isActive,
        })
        setIsDialogOpen(true)
    }

    const openSendDialog = (offer: Offer) => {
        setSelectedOffer(offer)
        setSelectedContactId("")
        setSelectedContactIds([])
        setSendMode("single")
        setIsSendDialogOpen(true)
    }

    const toggleContactSelection = (contactId: string) => {
        setSelectedContactIds(prev =>
            prev.includes(contactId)
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        )
    }

    const sendOfferToContact = async (contactId: string, offer: Offer): Promise<boolean> => {
        try {
            const contact = contacts.find(c => c.id === contactId)
            if (!contact) throw new Error("Contact not found")

            // Get or create conversation for this contact
            const conversationsResponse = await fetch('/api/conversations')
            const conversationsData = await conversationsResponse.json()

            let conversation = conversationsData.conversations?.find(
                (c: any) => c.contactId === contactId
            )

            if (!conversation) {
                // Create new conversation
                const createConvResponse = await fetch('/api/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contactId })
                })
                const createConvData = await createConvResponse.json()
                if (!createConvData.success) throw new Error("Failed to create conversation")
                conversation = createConvData.data
            }

            // Send offer as message
            const messageContent = `🎁 *${offer.title}*\n\n${offer.description ? offer.description + '\n\n' : ''}${offer.content}\n\n📅 Valid: ${format(new Date(offer.validFrom), "MMM dd")} - ${format(new Date(offer.validTo), "MMM dd, yyyy")}`

            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: conversation.id,
                    content: messageContent,
                    direction: 'OUTGOING',
                    type: 'TEXT'
                })
            })

            const data = await response.json()
            return data.success
        } catch (error) {
            console.error(`Error sending to ${contactId}:`, error)
            return false
        }
    }

    const handleSendOffer = async () => {
        if (!selectedOffer) {
            toast({
                title: "Error",
                description: "No offer selected",
                variant: "destructive",
            })
            return
        }

        if (sendMode === "single") {
            if (!selectedContactId) {
                toast({
                    title: "Error",
                    description: "Please select a contact",
                    variant: "destructive",
                })
                return
            }

            if (!selectedOffer) return
            const success = await sendOfferToContact(selectedContactId, selectedOffer)
            if (success) {
                const contact = contacts.find(c => c.id === selectedContactId)
                toast({
                    title: "Success",
                    description: `Offer sent to ${contact?.name || 'contact'}`,
                })
                setIsSendDialogOpen(false)
                setSelectedContactId("")
            } else {
                toast({
                    title: "Error",
                    description: "Failed to send offer",
                    variant: "destructive",
                })
            }
        } else {
            // Bulk send
            if (selectedContactIds.length === 0) {
                toast({
                    title: "Error",
                    description: "Please select at least one contact",
                    variant: "destructive",
                })
                return
            }

            let successCount = 0
            let failCount = 0

            if (!selectedOffer) return
            for (const contactId of selectedContactIds) {
                const success = await sendOfferToContact(contactId, selectedOffer)
                if (success) {
                    successCount++
                } else {
                    failCount++
                }
                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            toast({
                title: "Bulk Send Complete",
                description: `Sent to ${successCount} contact(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
            })

            setIsSendDialogOpen(false)
            setSelectedContactIds([])
        }
    }

    return (
        <AppLayout title={t("offers")}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{t("offers")}</h2>
                        <p className="text-muted-foreground">Create and manage promotional offers for customers</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open)
                        if (!open) resetForm()
                    }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                {t("createOffer")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle>{editingOffer ? "Edit Offer" : t("createOffer")}</DialogTitle>
                                    <DialogDescription>Create promotional offers to send to customers</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="title">{t("offerTitle")} *</Label>
                                        <Input
                                            id="title"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">{t("description")}</Label>
                                        <Input
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="content">{t("messageContent")} *</Label>
                                        <Textarea
                                            id="content"
                                            value={formData.content}
                                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                            rows={4}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="validFrom">{t("validFrom")} *</Label>
                                            <Input
                                                id="validFrom"
                                                type="date"
                                                value={formData.validFrom}
                                                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="validTo">{t("validTo")} *</Label>
                                            <Input
                                                id="validTo"
                                                type="date"
                                                value={formData.validTo}
                                                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="isActive">{t("active")}</Label>
                                        <Switch
                                            id="isActive"
                                            checked={formData.isActive}
                                            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        {t("cancel")}
                                    </Button>
                                    <Button type="submit">{t("save")}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <p className="mt-4 text-sm text-muted-foreground">{t("loading")}</p>
                        </div>
                    </div>
                ) : offers.length === 0 ? (
                    <Card className="rounded-2xl shadow-soft">
                        <CardContent className="flex h-64 flex-col items-center justify-center">
                            <Tag className="h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-4 text-sm text-muted-foreground">No offers found</p>
                            <p className="text-xs text-muted-foreground">Create your first offer to get started</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {offers.map((offer) => (
                            <Card key={offer.id} className="rounded-2xl shadow-soft hover:shadow-soft-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                <Tag className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{offer.title}</CardTitle>
                                                <CardDescription>
                                                    {offer.isActive ? (
                                                        <span className="text-success">{t("active")}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">{t("inactive")}</span>
                                                    )}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => openEditDialog(offer)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(offer.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {offer.description && (
                                        <p className="text-sm text-muted-foreground">{offer.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {format(new Date(offer.validFrom), "MMM dd")} - {format(new Date(offer.validTo), "MMM dd, yyyy")}
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2"
                                        onClick={() => openSendDialog(offer)}
                                    >
                                        <Send className="h-4 w-4" />
                                        {t("sendOffer")}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Send Offer Dialog */}
                <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Send Offer</DialogTitle>
                            <DialogDescription>
                                Choose to send to a single contact or multiple contacts
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {selectedOffer && (
                                <div className="rounded-lg bg-muted p-3 space-y-1">
                                    <p className="font-semibold text-sm">{selectedOffer.title}</p>
                                    {selectedOffer.description && (
                                        <p className="text-xs text-muted-foreground">{selectedOffer.description}</p>
                                    )}
                                </div>
                            )}

                            {/* Send Mode Selection */}
                            <div className="grid gap-2">
                                <Label>Send Mode</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={sendMode === "single" ? "default" : "outline"}
                                        className="flex-1"
                                        onClick={() => setSendMode("single")}
                                    >
                                        <Users className="mr-2 h-4 w-4" />
                                        Single Contact
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={sendMode === "bulk" ? "default" : "outline"}
                                        className="flex-1"
                                        onClick={() => setSendMode("bulk")}
                                    >
                                        <CheckSquare className="mr-2 h-4 w-4" />
                                        Bulk Send
                                    </Button>
                                </div>
                            </div>

                            {/* Single Contact Selection */}
                            {sendMode === "single" && (
                                <div className="grid gap-2">
                                    <Label htmlFor="contact">Select Contact *</Label>
                                    <Select value={selectedContactId || "none"} onValueChange={(value) => setSelectedContactId(value === "none" ? "" : value)}>
                                        <SelectTrigger id="contact">
                                            <SelectValue placeholder="Choose a contact" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(contacts || []).length === 0 ? (
                                                <SelectItem value="none" disabled>No contacts available</SelectItem>
                                            ) : (
                                                (contacts || []).map((contact) => (
                                                    <SelectItem key={contact.id} value={contact.id}>
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4" />
                                                            <span>{contact.name}</span>
                                                            <span className="text-xs text-muted-foreground">({contact.phone})</span>
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Bulk Contact Selection */}
                            {sendMode === "bulk" && (
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Select Contacts *</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => {
                                                    const contactsList = contacts || []
                                                    if (selectedContactIds.length === contactsList.length) {
                                                        setSelectedContactIds([])
                                                    } else {
                                                        setSelectedContactIds(contactsList.map(c => c.id))
                                                    }
                                                }}
                                            >
                                                {selectedContactIds.length === (contacts?.length || 0) ? "Deselect All" : "Select All"}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto border rounded-lg p-2 space-y-2">
                                        {(contacts || []).length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">No contacts available</p>
                                        ) : (
                                            (contacts || []).map((contact) => (
                                                <div
                                                    key={contact.id}
                                                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                                                        selectedContactIds.includes(contact.id)
                                                            ? "bg-primary/10 border-primary"
                                                            : "hover:bg-muted"
                                                    }`}
                                                    onClick={() => toggleContactSelection(contact.id)}
                                                >
                                                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                                                        selectedContactIds.includes(contact.id)
                                                            ? "bg-primary border-primary"
                                                            : "border-muted-foreground"
                                                    }`}>
                                                        {selectedContactIds.includes(contact.id) && (
                                                            <CheckSquare className="h-3 w-3 text-primary-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{contact.name}</p>
                                                        <p className="text-xs text-muted-foreground">{contact.phone}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {selectedContactIds.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {selectedContactIds.length} contact(s) selected
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSendDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleSendOffer}>
                                <Send className="mr-2 h-4 w-4" />
                                {sendMode === "single" ? "Send Offer" : `Send to ${selectedContactIds.length} Contact(s)`}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    )
}
