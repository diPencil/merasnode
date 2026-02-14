"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Tag, Calendar, Send, Edit, Trash2, Users, CheckSquare, X, ImageIcon, BarChart2 } from "lucide-react"
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
import { authenticatedFetch, getUserRole, getAuthHeader } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"
import { format } from "date-fns"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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

interface Offer {
    id: string
    title: string
    description?: string
    content: string
    imageUrl?: string | null
    validFrom: string
    validTo: string
    isActive: boolean
    createdAt: string
    recipientsCount?: number
    singleSendCount?: number
    bulkSendCount?: number
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
        imageUrl: "" as string,
        validFrom: "",
        validTo: "",
        isActive: true,
    })
    const [imageUploading, setImageUploading] = useState(false)
    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
    const [contacts, setContacts] = useState<Contact[]>([])
    const [selectedContactId, setSelectedContactId] = useState("")
    const [sendMode, setSendMode] = useState<"single" | "bulk">("single")
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const canDeleteOffer = hasPermission((getUserRole() || "AGENT") as UserRole, "delete_offer")

    useEffect(() => {
        fetchOffers()
        fetchContacts()
    }, [])

    const fetchOffers = async () => {
        try {
            setIsLoading(true)
            const response = await authenticatedFetch("/api/offers")
            const data = await response.json()
            if (data.success) {
                setOffers(data.offers)
            }
        } catch (error) {
            console.error("Error fetching offers:", error)
            toast({
                title: t("error"),
                description: t("failedToLoadOffers"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const fetchContacts = async () => {
        try {
            const response = await authenticatedFetch("/api/contacts")
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

            const payload = { ...formData, imageUrl: formData.imageUrl || null }
            const response = await authenticatedFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            const data = await response.json()
            if (data.success) {
                toast({
                    title: t("success"),
                    description: editingOffer ? t("offerUpdatedSuccess") : t("offerCreatedSuccess"),
                })
                setIsDialogOpen(false)
                resetForm()
                fetchOffers()
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            toast({
                title: t("error"),
                description: error instanceof Error ? error.message : t("failedToSaveOffer"),
                variant: "destructive",
            })
        }
    }

    const handleDeleteClick = (id: string) => {
        setDeleteConfirmId(id)
    }

    const confirmDeleteOffer = async () => {
        const id = deleteConfirmId
        setDeleteConfirmId(null)
        if (!id) return
        try {
            const response = await authenticatedFetch(`/api/offers/${id}`, { method: "DELETE" })
            const data = await response.json()
            if (data.success) {
                toast({
                    title: t("success"),
                    description: t("offerDeletedSuccess"),
                })
                fetchOffers()
            }
        } catch (error) {
            toast({
                title: t("error"),
                description: t("failedToDeleteOffer"),
                variant: "destructive",
            })
        }
    }

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            content: "",
            imageUrl: "",
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
            imageUrl: offer.imageUrl || "",
            validFrom: offer.validFrom.split("T")[0],
            validTo: offer.validTo.split("T")[0],
            isActive: offer.isActive,
        })
        setIsDialogOpen(true)
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith("image/")) {
            toast({ title: t("error"), description: "Please select an image file (e.g. JPG, PNG)", variant: "destructive" })
            return
        }
        setImageUploading(true)
        try {
            const form = new FormData()
            form.append("file", file)
            // لا نضع Content-Type حتى يضبط المتصفح multipart/form-data تلقائياً
            const response = await fetch("/api/upload", {
                method: "POST",
                headers: { ...getAuthHeader() },
                body: form,
            })
            const data = await response.json()
            if (data.success && data.url) {
                setFormData((prev) => ({ ...prev, imageUrl: data.url }))
                toast({ title: t("success"), description: "Image added" })
            } else throw new Error(data.error || "Upload failed")
        } catch (err) {
            toast({ title: t("error"), description: err instanceof Error ? err.message : "Upload failed", variant: "destructive" })
        } finally {
            setImageUploading(false)
            e.target.value = ""
        }
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
            const conversationsResponse = await authenticatedFetch('/api/conversations')
            const conversationsData = await conversationsResponse.json()

            let conversation = conversationsData.conversations?.find(
                (c: any) => c.contactId === contactId
            )

            if (!conversation) {
                // Create new conversation
                const createConvResponse = await authenticatedFetch('/api/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contactId })
                })
                const createConvData = await createConvResponse.json()
                if (!createConvData.success) throw new Error("Failed to create conversation")
                conversation = createConvData.data
            }

            // Send offer as message (with optional image)
            const messageContent = `🎁 *${offer.title}*\n\n${offer.description ? offer.description + '\n\n' : ''}${offer.content}\n\n📅 Valid: ${format(new Date(offer.validFrom), "MMM dd")} - ${format(new Date(offer.validTo), "MMM dd, yyyy")}`

            const response = await authenticatedFetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: conversation.id,
                    content: messageContent,
                    direction: 'OUTGOING',
                    type: offer.imageUrl ? 'IMAGE' : 'TEXT',
                    mediaUrl: offer.imageUrl || undefined,
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
                title: t("error"),
                description: t("noOfferSelected"),
                variant: "destructive",
            })
            return
        }

        if (sendMode === "single") {
            if (!selectedContactId) {
                toast({
                    title: t("error"),
                    description: t("pleaseSelectContact"),
                    variant: "destructive",
                })
                return
            }

            if (!selectedOffer) return
            const success = await sendOfferToContact(selectedContactId, selectedOffer)
            if (success) {
                try {
                    await authenticatedFetch(`/api/offers/${selectedOffer.id}/record-send`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ mode: "single", recipientCount: 1 }),
                    })
                } catch (_) { /* ignore */ }
                fetchOffers()
                const contact = contacts.find(c => c.id === selectedContactId)
                toast({
                    title: t("success"),
                    description: t("offerSentToContact").replace("{name}", contact?.name || t("contactLabel")),
                })
                setIsSendDialogOpen(false)
                setSelectedContactId("")
            } else {
                toast({
                    title: t("error"),
                    description: t("failedToSendOffer"),
                    variant: "destructive",
                })
            }
        } else {
            // Bulk send
            if (selectedContactIds.length === 0) {
                toast({
                    title: t("error"),
                    description: t("pleaseSelectAtLeastOneContact"),
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

            if (successCount > 0) {
                try {
                    await authenticatedFetch(`/api/offers/${selectedOffer.id}/record-send`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ mode: "bulk", recipientCount: successCount }),
                    })
                } catch (_) { /* ignore */ }
                fetchOffers()
            }

            toast({
                title: t("bulkSendComplete"),
                description: t("sentToContactsCount").replace("{n}", String(successCount)) + (failCount > 0 ? `, ${t("bulkSendFailedCount").replace("{n}", String(failCount))}` : ""),
            })

            setIsSendDialogOpen(false)
            setSelectedContactIds([])
        }
    }

    return (
        <AppLayout title={t("offers")}>
            {canDeleteOffer && (
            <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("confirmDeleteOffer")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteOffer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            )}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{t("offers")}</h2>
                        <p className="text-muted-foreground">{t("offersPageDescription")}</p>
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
                                    <DialogTitle>{editingOffer ? t("editOffer") : t("createOffer")}</DialogTitle>
                                    <DialogDescription>{t("createPromotionalOffersDesc")}</DialogDescription>
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
                                    <div className="grid gap-2">
                                        <Label htmlFor="imageUrl">{t("offerImage")}</Label>
                                        <p className="text-xs text-muted-foreground">{t("offerImageOptional")}</p>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <Input
                                                id="imageUrl"
                                                type="url"
                                                placeholder="https://..."
                                                value={formData.imageUrl}
                                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                                className="flex-1 min-w-[200px]"
                                            />
                                            <label className="cursor-pointer">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="sr-only"
                                                    onChange={handleImageUpload}
                                                    disabled={imageUploading}
                                                />
                                                <Button type="button" variant="outline" size="sm" asChild>
                                                    <span>{imageUploading ? t("loading") + "..." : t("uploadImage")}</span>
                                                </Button>
                                            </label>
                                        </div>
                                        {formData.imageUrl && (
                                            <div className="mt-2 relative rounded-lg overflow-hidden border bg-muted max-w-[200px]">
                                                <img src={formData.imageUrl} alt="" className="w-full h-auto object-cover max-h-32" />
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute top-1 right-1 h-7 w-7"
                                                    onClick={() => setFormData({ ...formData, imageUrl: "" })}
                                                    aria-label={t("delete")}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
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
                            <p className="mt-4 text-sm text-muted-foreground">{t("noOffersFound")}</p>
                            <p className="text-xs text-muted-foreground">{t("createFirstOffer")}</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {offers.map((offer) => (
                            <Card key={offer.id} className="rounded-2xl shadow-soft hover:shadow-soft-lg transition-shadow overflow-hidden">
                                {/* صورة العرض في أعلى الكارت — تظهر دائماً (صورة أو placeholder) */}
                                <div className="relative w-full aspect-16/10 bg-muted shrink-0">
                                    {offer.imageUrl ? (
                                        <img
                                            src={offer.imageUrl}
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/60">
                                            <ImageIcon className="h-12 w-12 mb-1" />
                                            <span className="text-xs">{t("offerImage")}</span>
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-8 w-8 rounded-full shadow-sm bg-background/80 hover:bg-background"
                                            onClick={() => openEditDialog(offer)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        {canDeleteOffer && (
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="h-8 w-8 rounded-full shadow-sm bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                                                onClick={() => handleDeleteClick(offer.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    {offer.isActive && (
                                        <span className="absolute bottom-2 start-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                                            {t("active")}
                                        </span>
                                    )}
                                </div>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg line-clamp-1">{offer.title}</CardTitle>
                                    {offer.description && (
                                        <CardDescription className="line-clamp-2">{offer.description}</CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-3 pt-0">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4 shrink-0" />
                                        <span>
                                            {format(new Date(offer.validFrom), "MMM dd")} - {format(new Date(offer.validTo), "MMM dd, yyyy")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <BarChart2 className="h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            {(offer.recipientsCount ?? 0) === 0 && (offer.singleSendCount ?? 0) === 0 && (offer.bulkSendCount ?? 0) === 0
                                                ? t("offerStatsNeverSent")
                                                : [
                                                    t("offerStatsSentTo").replace("{n}", String(offer.recipientsCount ?? 0)),
                                                    (offer.singleSendCount ?? 0) > 0 ? t("offerStatsSingle").replace("{n}", String(offer.singleSendCount)) : null,
                                                    (offer.bulkSendCount ?? 0) > 0 ? t("offerStatsBulk").replace("{n}", String(offer.bulkSendCount)) : null,
                                                ].filter(Boolean).join(" · ")}
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
                            <DialogTitle>{t("sendOfferDialogTitle")}</DialogTitle>
                            <DialogDescription>
                                {t("sendOfferDialogDesc")}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {selectedOffer && (
                                <div className="rounded-lg bg-muted p-3 space-y-2">
                                    {selectedOffer.imageUrl && (
                                        <div className="rounded-md overflow-hidden border bg-background max-h-24">
                                            <img src={selectedOffer.imageUrl} alt="" className="w-full h-full object-cover max-h-24" />
                                        </div>
                                    )}
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
                                    <Label htmlFor="contact">{t("selectContactRequired")}</Label>
                                    <Select value={selectedContactId || "none"} onValueChange={(value) => setSelectedContactId(value === "none" ? "" : value)}>
                                        <SelectTrigger id="contact">
                                            <SelectValue placeholder={t("chooseContact")} />
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
                                        <Label>{t("selectContactsRequired")}</Label>
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
                                                {selectedContactIds.length === (contacts?.length || 0) ? t("deselectAll") : t("selectAll")}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto border rounded-lg p-2 space-y-2">
                                        {(contacts || []).length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">{t("noContactsAvailable")}</p>
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
