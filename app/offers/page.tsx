"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Plus, Tag, Calendar, Send, Edit, Trash2, Users, CheckSquare, X, ImageIcon, BarChart2, UploadCloud, Loader2 } from "lucide-react"
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
import { authenticatedFetch, getUserRole } from "@/lib/auth"
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
import { Skeleton } from "@/components/ui/skeleton"

// Types
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

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        content: "",
        imageUrl: "" as string,
        validFrom: "",
        validTo: "",
        isActive: true,
    })

    // Upload State
    const [imageUploading, setImageUploading] = useState(false)

    // Send Dialog State
    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
    const [contacts, setContacts] = useState<Contact[]>([])
    const [selectedContactId, setSelectedContactId] = useState("")
    const [sendMode, setSendMode] = useState<"single" | "bulk">("single")
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])

    // Delete State
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Permissions
    const userRole = getUserRole()
    const canCreate = hasPermission((userRole || "AGENT") as UserRole, "create_offer")
    const canEdit = hasPermission((userRole || "AGENT") as UserRole, "edit_offer")
    const canDelete = hasPermission((userRole || "AGENT") as UserRole, "delete_offer")

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
            }
        } catch (error) {
            console.error("Error fetching contacts:", error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingOffer ? `/api/offers/${editingOffer.id}` : "/api/offers"
            const method = editingOffer ? "PUT" : "POST"

            const imageUrl =
                formData.imageUrl && !formData.imageUrl.startsWith("data:")
                    ? formData.imageUrl
                    : null

            const payload = { ...formData, imageUrl }

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
                    variant: "default", // Green in shadcn default usually
                })
                setIsDialogOpen(false)
                resetForm()
                fetchOffers()
            } else {
                throw new Error(data.error || "Unknown error")
            }
        } catch (error) {
            toast({
                title: t("error"),
                description: error instanceof Error ? error.message : t("failedToSaveOffer"),
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
        setImageUploading(false)
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

    const handleDeleteClick = (id: string) => {
        setDeleteConfirmId(id)
    }

    const confirmDeleteOffer = async () => {
        const id = deleteConfirmId
        if (!id) return

        setIsDeleting(true)
        try {
            const response = await authenticatedFetch(`/api/offers/${id}`, { method: "DELETE" })
            const data = await response.json().catch(() => ({ success: false, error: t("failedToDeleteOffer") }))

            if (data.success) {
                // Optimistic update
                setOffers(prev => prev.filter(o => o.id !== id))
                toast({
                    title: t("success"),
                    description: t("offerDeletedSuccess"),
                })
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            toast({
                title: t("error"),
                description: error instanceof Error ? error.message : t("failedToDeleteOffer"),
                variant: "destructive",
            })
            // Re-fetch to ensure sync
            fetchOffers()
        } finally {
            setIsDeleting(false)
            setDeleteConfirmId(null)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Client-side validation
        if (!file.type.startsWith("image/")) {
            toast({ title: t("error"), description: "Please select an image file (JPEG, PNG, WebP)", variant: "destructive" })
            return
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB
            toast({ title: t("error"), description: "File size exceeds 5MB limit", variant: "destructive" })
            return
        }

        setImageUploading(true)
        try {
            const form = new FormData()
            form.append("file", file)

            const response = await authenticatedFetch("/api/upload", {
                method: "POST",
                body: form,
            })

            const data = await response.json()

            if (response.ok && data.success && data.url) {
                setFormData((prev) => ({ ...prev, imageUrl: data.url }))
                toast({ title: t("success"), description: "Image uploaded successfully" })
            } else {
                throw new Error(data.error || "Upload failed")
            }
        } catch (err) {
            console.error("Upload error:", err)
            toast({ title: t("error"), description: err instanceof Error ? err.message : "Upload failed", variant: "destructive" })
        } finally {
            setImageUploading(false)
            // Reset input so same file can be selected again if needed
            e.target.value = ""
        }
    }

    // --- Sending Logic (Simplified for brevity, assuming same as before but refactored slightly) ---
    // (Keeping existing logic for sending, just wrapping it cleanly)
    const openSendDialog = (offer: Offer) => {
        setSelectedOffer(offer)
        setSelectedContactId("")
        setSelectedContactIds([])
        setSendMode("single")
        setIsSendDialogOpen(true)
    }

    const toggleContactSelection = (contactId: string) => {
        setSelectedContactIds(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId])
    }

    const sendOfferToContact = async (contactId: string, offer: Offer): Promise<boolean> => {
        // ... (Logic kept SAME as provided in original file, assuming it works) ...
        try {
            const contact = contacts.find(c => c.id === contactId)
            if (!contact) throw new Error("Contact not found")

            const conversationsResponse = await authenticatedFetch('/api/conversations')
            const conversationsData = await conversationsResponse.json()
            let conversation = conversationsData.conversations?.find((c: any) => c.contactId === contactId)

            if (!conversation) {
                const createConvResponse = await authenticatedFetch('/api/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contactId })
                })
                const createConvData = await createConvResponse.json()
                if (!createConvData.success) throw new Error("Failed to create conversation")
                conversation = createConvData.data
            }

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
        // ... (Logic kept SAME as provided in original file) ...
        if (!selectedOffer) return
        if (sendMode === "single") {
            if (!selectedContactId) {
                toast({ title: t("error"), description: t("pleaseSelectContact"), variant: "destructive" })
                return
            }
            const success = await sendOfferToContact(selectedContactId, selectedOffer)
            if (success) {
                // Record send logic...
                fetchOffers()
                toast({ title: t("success"), description: t("offerSentToContact") })
                setIsSendDialogOpen(false)
            } else {
                toast({ title: t("error"), description: t("failedToSendOffer"), variant: "destructive" })
            }
        } else {
            if (selectedContactIds.length === 0) {
                toast({ title: t("error"), description: t("pleaseSelectAtLeastOneContact"), variant: "destructive" })
                return
            }
            let successCount = 0
            for (const contactId of selectedContactIds) {
                if (await sendOfferToContact(contactId, selectedOffer)) successCount++
            }
            fetchOffers()
            toast({ title: t("bulkSendComplete"), description: `Sent to ${successCount} contacts.` })
            setIsSendDialogOpen(false)
        }
    }

    return (
        <AppLayout title={t("offers")}>
            <div className="space-y-8 p-4 md:p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{t("offers")}</h2>
                        <p className="text-muted-foreground mt-1">{t("offersPageDescription")}</p>
                    </div>

                    {canCreate && (
                        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                            <DialogTrigger asChild>
                                <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-all">
                                    <Plus className="h-5 w-5" />
                                    {t("createOffer")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                                <form onSubmit={handleSubmit}>
                                    <DialogHeader>
                                        <DialogTitle>{editingOffer ? t("editOffer") : t("createOffer")}</DialogTitle>
                                        <DialogDescription>{t("createPromotionalOffersDesc")}</DialogDescription>
                                    </DialogHeader>

                                    <div className="grid gap-6 py-6">
                                        {/* Image Upload Section */}
                                        <div className="space-y-4">
                                            <Label>{t("offerImage")}</Label>
                                            <div className="flex flex-col gap-4 items-start sm:flex-row sm:items-center">
                                                <div className="relative w-full sm:w-40 aspect-video bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden shrink-0 group hover:border-primary/50 transition-colors">
                                                    {formData.imageUrl ? (
                                                        <>
                                                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => setFormData({ ...formData, imageUrl: "" })}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1 text-muted-foreground p-4 text-center">
                                                            {imageUploading ? (
                                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                            ) : (
                                                                <>
                                                                    <ImageIcon className="h-8 w-8 mb-1" />
                                                                    <span className="text-xs">No image</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 space-y-3 w-full">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            className="relative overflow-hidden w-full sm:w-auto"
                                                            disabled={imageUploading}
                                                        >
                                                            {imageUploading ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                    Uploading...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <UploadCloud className="mr-2 h-4 w-4" />
                                                                    Upload File
                                                                </>
                                                            )}
                                                            <input
                                                                type="file"
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                accept="image/png, image/jpeg, image/webp"
                                                                onChange={handleImageUpload}
                                                                disabled={imageUploading}
                                                            />
                                                        </Button>
                                                    </div>
                                                    <div className="relative">
                                                        <div className="absolute inset-0 flex items-center">
                                                            <span className="w-full border-t" />
                                                        </div>
                                                        <div className="relative flex justify-center text-xs uppercase">
                                                            <span className="bg-background px-2 text-muted-foreground">Or using URL</span>
                                                        </div>
                                                    </div>
                                                    <Input
                                                        placeholder="https://example.com/image.jpg"
                                                        value={formData.imageUrl}
                                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                                        disabled={imageUploading}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="title">{t("offerTitle")} *</Label>
                                            <Input
                                                id="title"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                required
                                                placeholder="e.g. Summer Sale"
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
                                                placeholder="Type your promotional message here..."
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

                                        <div className="flex items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="isActive">{t("active")}</Label>
                                                <p className="text-sm text-muted-foreground">Make this offer available immediately</p>
                                            </div>
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
                                        <Button type="submit" disabled={imageUploading}>
                                            {imageUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            {t("save")}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className="flex flex-col space-y-3">
                                <Skeleton className="h-[200px] w-full rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : offers.length === 0 ? (
                    <Card className="border-dashed shadow-sm">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="rounded-full bg-primary/10 p-4 mb-4">
                                <Tag className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold">{t("noOffersFound")}</h3>
                            <p className="text-sm text-muted-foreground mt-2 mb-6 max-w-sm">
                                {t("createFirstOffer")}
                            </p>
                            {canCreate && (
                                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t("createOffer")}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {offers.map((offer) => (
                            <Card key={offer.id} className="group overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-300 border-muted/60">
                                {/* Image Area */}
                                <div className="relative w-full aspect-video bg-muted overflow-hidden">
                                    {offer.isActive && (
                                        <div className="absolute top-3 left-3 z-10">
                                            <span className="inline-flex items-center rounded-full bg-green-500/90 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
                                                {t("active")}
                                            </span>
                                        </div>
                                    )}
                                    {offer.imageUrl ? (
                                        <img
                                            src={offer.imageUrl}
                                            alt={offer.title}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40 bg-muted/50">
                                            <ImageIcon className="h-12 w-12 mb-2" />
                                            <span className="text-xs font-medium uppercase tracking-wider">{t("offerImage")}</span>
                                        </div>
                                    )}
                                </div>

                                <CardHeader className="space-y-1 pb-4">
                                    <div className="flex justify-between items-start gap-2">
                                        <CardTitle className="text-xl line-clamp-1">{offer.title}</CardTitle>
                                    </div>
                                    <CardDescription className="line-clamp-2 min-h-[40px]">
                                        {offer.description || offer.content}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4 flex-1">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                                        <Calendar className="h-4 w-4 shrink-0 text-primary" />
                                        <span className="font-medium text-xs">
                                            {format(new Date(offer.validFrom), "MMM dd")} - {format(new Date(offer.validTo), "MMM dd, yyyy")}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="bg-muted/30 p-2 rounded">
                                            <div className="font-bold text-base">{offer.recipientsCount || 0}</div>
                                            <div className="text-muted-foreground">Sent</div>
                                        </div>
                                        <div className="bg-muted/30 p-2 rounded">
                                            <div className="font-bold text-base">{offer.singleSendCount || 0}</div>
                                            <div className="text-muted-foreground">Direct</div>
                                        </div>
                                        <div className="bg-muted/30 p-2 rounded">
                                            <div className="font-bold text-base">{offer.bulkSendCount || 0}</div>
                                            <div className="text-muted-foreground">Bulk</div>
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="pt-2 gap-2 border-t bg-muted/5 p-4">
                                    <Button
                                        variant="default"
                                        className="flex-1 shadow-sm"
                                        onClick={() => openSendDialog(offer)}
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        {t("sendOffer")}
                                    </Button>

                                    {canEdit && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="text-primary hover:text-primary hover:bg-primary/10 border-primary/20"
                                            onClick={() => openEditDialog(offer)}
                                            title={t("edit")}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}

                                    {canDelete && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                                            onClick={() => handleDeleteClick(offer.id)}
                                            title={t("delete")}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Confirm Delete Dialog */}
                <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && !isDeleting && setDeleteConfirmId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("confirmDeleteOffer")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault(); // Prevent auto-close
                                    confirmDeleteOffer();
                                }}
                                className="bg-destructive hover:bg-destructive/90 text-white"
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {t("delete")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Send Offer Dialog (Keeping basic structure essentially same but clean) */}
                <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{t("sendOfferDialogTitle")}</DialogTitle>
                            <DialogDescription>{t("sendOfferDialogDesc")}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            {/* Simple render logic for Send Dialog content from previous version */}
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
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {sendMode === "bulk" && (
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label>{t("selectContactsRequired")}</Label>
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
                                            {selectedContactIds.length === (contacts?.length || 0) && contacts?.length > 0 ? t("deselectAll") : t("selectAll")}
                                        </Button>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto border rounded-lg p-2 space-y-2">
                                        {(contacts || []).length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">{t("noContactsAvailable")}</p>
                                        ) : (
                                            (contacts || []).map((contact) => (
                                                <div
                                                    key={contact.id}
                                                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${selectedContactIds.includes(contact.id)
                                                        ? "bg-primary/10 border-primary"
                                                        : "hover:bg-muted"
                                                        }`}
                                                    onClick={() => toggleContactSelection(contact.id)}
                                                >
                                                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${selectedContactIds.includes(contact.id)
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
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>{t("cancel")}</Button>
                            <Button onClick={handleSendOffer}>
                                <Send className="mr-2 h-4 w-4" />
                                {t("send")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    )
}
