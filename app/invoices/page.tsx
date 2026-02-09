"use client"

import { useEffect, useState } from "react"
import jsPDF from "jspdf"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Receipt, Download, Send, Search, MoreVertical, Eye } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Invoice {
    id: string
    invoiceNumber: string
    contactId: string
    contact: {
        name: string
        phone: string
    }
    amount: number
    currency: string
    status: string
    dueDate: string
    paidAt?: string
    createdAt: string
    items?: { description: string; amount: number }[]
}

export default function InvoicesPage() {
    const { t } = useI18n()
    const { toast } = useToast()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [contacts, setContacts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        contactId: "",
        amount: "",
        currency: "SAR",
        dueDate: "",
        notes: "",
        description: "",
    })
    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    // View Dialog State
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)

    useEffect(() => {
        fetchInvoices()
        fetchContacts()
    }, [])

    const fetchInvoices = async () => {
        try {
            setIsLoading(true)
            const response = await fetch("/api/invoices")
            const data = await response.json()
            if (data.success) {
                setInvoices(data.invoices)
            }
        } catch (error) {
            console.error("Error fetching invoices:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchContacts = async () => {
        try {
            const response = await fetch("/api/contacts")
            const data = await response.json()
            if (data.success) {
                setContacts(data.contacts)
            }
        } catch (error) {
            console.error("Error fetching contacts:", error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const response = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount),
                }),
            })

            const data = await response.json()
            if (data.success) {
                toast({
                    title: t("success"),
                    description: t("invoiceCreatedSuccess"),
                })
                setIsDialogOpen(false)
                resetForm()
                fetchInvoices()
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            toast({
                title: t("error"),
                description: error instanceof Error ? error.message : t("failedToCreateInvoice"),
                variant: "destructive",
            })
        }
    }

    const resetForm = () => {
        setFormData({
            contactId: "",
            amount: "",
            currency: "SAR",
            dueDate: "",
            notes: "",
            description: "",
        })
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string; className?: string }> = {
            PAID: { variant: "default", label: t("paid"), className: "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-none shadow-none font-normal" },
            PENDING: { variant: "secondary", label: t("pending"), className: "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-none shadow-none font-normal" },
            OVERDUE: { variant: "destructive", label: t("overdue"), className: "bg-red-500/15 text-red-600 hover:bg-red-500/25 border-none shadow-none font-normal" },
            CANCELLED: { variant: "outline", label: t("cancelled"), className: "text-muted-foreground" },
        }
        const config = variants[status] || variants.PENDING
        return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
    }

    const openSendDialog = (invoice: Invoice) => {
        setSelectedInvoice(invoice)
        setIsSendDialogOpen(true)
    }

    const openViewDialog = (invoice: Invoice) => {
        setViewInvoice(invoice)
        setIsViewDialogOpen(true)
    }

    const handleSendInvoice = async () => {
        if (!selectedInvoice) return

        try {
            // Get or create conversation for this contact
            const conversationsResponse = await fetch('/api/conversations')
            const conversationsData = await conversationsResponse.json()

            let conversation = conversationsData.conversations?.find(
                (c: any) => c.contactId === selectedInvoice.contactId
            )

            if (!conversation) {
                // Create new conversation
                const createConvResponse = await fetch('/api/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contactId: selectedInvoice.contactId })
                })
                const createConvData = await createConvResponse.json()
                if (!createConvData.success) throw new Error("Failed to create conversation")
                conversation = createConvData.data
            }

            // Send invoice as formatted message
            const messageContent = `🧾 *INVOICE ${selectedInvoice.invoiceNumber}*\n\n` +
                `👤 Customer: ${selectedInvoice.contact.name}\n` +
                `💰 Amount: ${selectedInvoice.amount.toFixed(2)} ${selectedInvoice.currency}\n` +
                `📅 Due Date: ${format(new Date(selectedInvoice.dueDate), "MMM dd, yyyy")}\n` +
                `📊 Status: ${selectedInvoice.status}\n\n` +
                `Please proceed with payment at your earliest convenience.\n\n` +
                `Thank you for your business! 🙏`

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
            if (data.success) {
                toast({
                    title: t("success"),
                    description: t("invoiceSentTo").replace("{name}", selectedInvoice.contact.name),
                })
                setIsSendDialogOpen(false)
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            toast({
                title: t("error"),
                description: error instanceof Error ? error.message : t("failedToSendInvoice"),
                variant: "destructive",
            })
        }
    }

    const handleGeneratePDF = (invoice: Invoice) => {
        try {
            const doc = new jsPDF()

            // Set font sizes
            const titleSize = 20
            const headerSize = 12
            const normalSize = 10
            const smallSize = 8

            // Colors
            const primaryColor: [number, number, number] = [99, 102, 241] // Indigo
            const textColor: [number, number, number] = [31, 41, 55] // Gray-800
            const lightGray: [number, number, number] = [229, 231, 235] // Gray-200

            // Load and add logo
            const logo = new Image()
            logo.src = '/meras-logo.png'

            logo.onload = () => {
                // Add logo (20x20 size)
                doc.addImage(logo, 'PNG', 20, 10, 20, 20)

                // Header - Company Name (next to logo)
                doc.setFontSize(titleSize)
                doc.setTextColor(...primaryColor)
                doc.text("Meras CRM", 45, 25)

                // Invoice Title
                doc.setFontSize(headerSize)
                doc.setTextColor(...textColor)
                doc.text(`INVOICE ${invoice.invoiceNumber}`, 20, 40)

                // Invoice Status Badge
                const statusX = 150
                const statusY = 37
                if (invoice.status === 'PAID') {
                    doc.setFillColor(34, 197, 94) // Green
                } else if (invoice.status === 'PENDING') {
                    doc.setFillColor(234, 179, 8) // Yellow
                } else if (invoice.status === 'OVERDUE') {
                    doc.setFillColor(239, 68, 68) // Red
                } else {
                    doc.setFillColor(156, 163, 175) // Gray
                }
                doc.roundedRect(statusX, statusY, 35, 8, 2, 2, 'F')
                doc.setFontSize(normalSize)
                doc.setTextColor(255, 255, 255)
                doc.text(invoice.status, statusX + 17.5, statusY + 5.5, { align: 'center' })

                // Reset text color
                doc.setTextColor(...textColor)

                // Divider line
                doc.setDrawColor(...lightGray)
                doc.setLineWidth(0.5)
                doc.line(20, 50, 190, 50)

                // Customer Information
                doc.setFontSize(headerSize)
                doc.text("Bill To:", 20, 60)
                doc.setFontSize(normalSize)
                doc.text(invoice.contact.name, 20, 67)
                doc.setFontSize(smallSize)
                doc.setTextColor(107, 114, 128) // Gray-500
                doc.text(invoice.contact.phone, 20, 73)

                // Invoice Details (Right side)
                doc.setTextColor(...textColor)
                doc.setFontSize(normalSize)
                const detailsX = 120
                const detailsY = 60

                doc.text("Invoice Date:", detailsX, detailsY)
                doc.text(format(new Date(invoice.createdAt), "MMM dd, yyyy"), detailsX + 40, detailsY)

                doc.text("Due Date:", detailsX, detailsY + 7)
                doc.setTextColor(239, 68, 68) // Red for due date
                doc.text(format(new Date(invoice.dueDate), "MMM dd, yyyy"), detailsX + 40, detailsY + 7)
                doc.setTextColor(...textColor)

                // Items Table Header
                const tableY = 90
                doc.setFillColor(...lightGray)
                doc.rect(20, tableY, 170, 10, 'F')
                doc.setFontSize(normalSize)
                doc.text("Description", 25, tableY + 7)
                doc.text("Amount", 160, tableY + 7)

                // Items Table Content
                const itemY = tableY + 17
                const description = invoice.items && invoice.items.length > 0 ? (invoice.items[0].description || "Invoice Payment") : "Invoice Payment"
                doc.text(String(description), 25, itemY)
                doc.text(`${invoice.amount.toFixed(2)} ${invoice.currency}`, 160, itemY)

                // Divider
                doc.line(20, itemY + 5, 190, itemY + 5)

                // Total Section
                const totalY = itemY + 15
                doc.setFontSize(headerSize)
                doc.text("Total:", 120, totalY)
                doc.setFontSize(16)
                doc.setTextColor(...primaryColor)
                doc.text(`${invoice.amount.toFixed(2)} ${invoice.currency}`, 160, totalY)

                // Footer
                doc.setFontSize(smallSize)
                doc.setTextColor(107, 114, 128)
                const footerY = 270
                doc.text("Thank you for your business!", 105, footerY, { align: 'center' })
                doc.text("Please make payment by the due date.", 105, footerY + 5, { align: 'center' })

                // Save PDF
                doc.save(`Invoice-${invoice.invoiceNumber}.pdf`)

                toast({
                    title: t("success"),
                    description: t("pdfGeneratedSuccess"),
                })
            }

            logo.onerror = () => {
                // If logo fails to load, generate PDF without logo
                console.warn('Logo failed to load, generating PDF without logo')

                // Header - Company Name (without logo)
                doc.setFontSize(titleSize)
                doc.setTextColor(...primaryColor)
                doc.text("Meras CRM", 20, 20)

                // Invoice Title
                doc.setFontSize(headerSize)
                doc.setTextColor(...textColor)
                doc.text(`INVOICE ${invoice.invoiceNumber}`, 20, 35)

                // Invoice Status Badge
                const statusX = 150
                const statusY = 32
                if (invoice.status === 'PAID') {
                    doc.setFillColor(34, 197, 94) // Green
                } else if (invoice.status === 'PENDING') {
                    doc.setFillColor(234, 179, 8) // Yellow
                } else if (invoice.status === 'OVERDUE') {
                    doc.setFillColor(239, 68, 68) // Red
                } else {
                    doc.setFillColor(156, 163, 175) // Gray
                }
                doc.roundedRect(statusX, statusY, 35, 8, 2, 2, 'F')
                doc.setFontSize(normalSize)
                doc.setTextColor(255, 255, 255)
                doc.text(invoice.status, statusX + 17.5, statusY + 5.5, { align: 'center' })

                // Reset text color
                doc.setTextColor(...textColor)

                // Divider line
                doc.setDrawColor(...lightGray)
                doc.setLineWidth(0.5)
                doc.line(20, 45, 190, 45)

                // Customer Information
                doc.setFontSize(headerSize)
                doc.text("Bill To:", 20, 55)
                doc.setFontSize(normalSize)
                doc.text(invoice.contact.name, 20, 62)
                doc.setFontSize(smallSize)
                doc.setTextColor(107, 114, 128) // Gray-500
                doc.text(invoice.contact.phone, 20, 68)

                // Invoice Details (Right side)
                doc.setTextColor(...textColor)
                doc.setFontSize(normalSize)
                const detailsX = 120
                let detailsY = 55

                doc.text("Invoice Date:", detailsX, detailsY)
                doc.text(format(new Date(invoice.createdAt), "MMM dd, yyyy"), detailsX + 40, detailsY)

                detailsY += 7
                doc.text("Due Date:", detailsX, detailsY)
                doc.setTextColor(239, 68, 68) // Red for due date
                doc.text(format(new Date(invoice.dueDate), "MMM dd, yyyy"), detailsX + 40, detailsY)
                doc.setTextColor(...textColor)

                // Items Table Header
                const tableY = 85
                doc.setFillColor(...lightGray)
                doc.rect(20, tableY, 170, 10, 'F')
                doc.setFontSize(normalSize)
                doc.text("Description", 25, tableY + 7)
                doc.text("Amount", 160, tableY + 7)

                // Items Table Content
                const itemY = tableY + 17
                doc.text("Invoice Payment", 25, itemY)
                doc.text(`${invoice.amount.toFixed(2)} ${invoice.currency}`, 160, itemY)

                // Divider
                doc.line(20, itemY + 5, 190, itemY + 5)

                // Total Section
                const totalY = itemY + 15
                doc.setFontSize(headerSize)
                doc.text("Total:", 120, totalY)
                doc.setFontSize(16)
                doc.setTextColor(...primaryColor)
                doc.text(`${invoice.amount.toFixed(2)} ${invoice.currency}`, 160, totalY)

                // Footer
                doc.setFontSize(smallSize)
                doc.setTextColor(107, 114, 128)
                const footerY = 270
                doc.text("Thank you for your business!", 105, footerY, { align: 'center' })
                doc.text("Please make payment by the due date.", 105, footerY + 5, { align: 'center' })

                // Save PDF
                doc.save(`Invoice-${invoice.invoiceNumber}.pdf`)

                toast({
                    title: t("success"),
                    description: t("pdfGeneratedLogoUnavailable"),
                })
            }
        } catch (error) {
            console.error('Error generating PDF:', error)
            toast({
                title: t("error"),
                description: t("failedToGeneratePdf"),
                variant: "destructive",
            })
        }
    }

    const filteredInvoices = invoices.filter((invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.contact.phone.includes(searchQuery)
    )

    return (
        <AppLayout title={t("invoices")}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight">{t("invoices")}</h2>
                        <Badge variant="outline" className="text-sm px-2.5 py-0.5 h-7">
                            Total: {filteredInvoices.length}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t("searchInvoices") || "Search invoices..."}
                                className="pl-9 h-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={(open) => {
                            setIsDialogOpen(open)
                            if (!open) resetForm()
                        }}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 h-9">
                                    <Plus className="h-4 w-4" />
                                    {t("createInvoice")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <form onSubmit={handleSubmit}>
                                    <DialogHeader>
                                        <DialogTitle>{t("createInvoice")}</DialogTitle>
                                        <DialogDescription>Create a new invoice for a customer</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="contactId">Customer *</Label>
                                            <Select
                                                value={formData.contactId}
                                                onValueChange={(value) => setFormData({ ...formData, contactId: value })}
                                                required
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("selectCustomer")} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {contacts?.map((contact) => (
                                                        <SelectItem key={contact.id} value={contact.id}>
                                                            {contact.name} - {contact.phone}
                                                        </SelectItem>
                                                    )) || <SelectItem value="no-contacts" disabled>No contacts available</SelectItem>}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="description">Service / Description</Label>
                                            <Input
                                                id="description"
                                                placeholder={t("servicePlaceholder")}
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="amount">{t("amount")} *</Label>
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.amount}
                                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="currency">Currency</Label>
                                                <Select
                                                    value={formData.currency}
                                                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="SAR">SAR</SelectItem>
                                                        <SelectItem value="USD">USD</SelectItem>
                                                        <SelectItem value="EUR">EUR</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="dueDate">{t("dueDate")} *</Label>
                                            <Input
                                                id="dueDate"
                                                type="date"
                                                value={formData.dueDate}
                                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                                required
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
                </div>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <p className="mt-4 text-sm text-muted-foreground">{t("loading")}</p>
                        </div>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <Card className="rounded-2xl shadow-soft">
                        <div className="flex h-64 flex-col items-center justify-center p-8 text-center">
                            <Receipt className="h-12 w-12 text-muted-foreground/50" />
                            <h3 className="mt-4 text-lg font-semibold">
                                {searchQuery ? t("noMatchingInvoices") : t("noInvoicesFound")}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {searchQuery ? t("tryAdjustingSearch") : t("createFirstInvoice")}
                            </p>
                            {!searchQuery && (
                                <Button
                                    variant="outline"
                                    className="mt-6"
                                    onClick={() => {
                                        resetForm()
                                        setIsDialogOpen(true)
                                    }}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t("createInvoice")}
                                </Button>
                            )}
                        </div>
                    </Card>
                ) : (
                    <Card className="rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead>{t("invoiceNumber")}</TableHead>
                                        <TableHead>{t("customerLabel")}</TableHead>
                                        <TableHead>{t("amountLabel")}</TableHead>
                                        <TableHead>{t("status")}</TableHead>
                                        <TableHead>{t("dueDateLabel")}</TableHead>
                                        <TableHead className="text-end w-[80px]">{t("actionsLabel")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInvoices.map((invoice, index) => (
                                        <TableRow key={invoice.id} className="group">
                                            <TableCell className="text-muted-foreground font-medium">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {invoice.invoiceNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{invoice.contact.name}</span>
                                                    <span className="text-xs text-muted-foreground">{invoice.contact.phone}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {invoice.amount.toFixed(2)} {invoice.currency}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(invoice.status)}
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="sr-only">{t("openMenu")}</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[200px]">
                                                        <DropdownMenuLabel>{t("actionsLabel")}</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => openViewDialog(invoice)}>
                                                            <Eye className="me-2 h-4 w-4" />
                                                            {t("viewDetails")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleGeneratePDF(invoice)}>
                                                            <Download className="me-2 h-4 w-4" />
                                                            {t("generatePDF")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openSendDialog(invoice)}>
                                                            <Send className="me-2 h-4 w-4" />
                                                            {t("sendInvoice")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                )}

                {/* Send Invoice Dialog */}
                <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Send Invoice to Customer</DialogTitle>
                            <DialogDescription>
                                Send this invoice via WhatsApp to the customer
                            </DialogDescription>
                        </DialogHeader>
                        {selectedInvoice && (
                            <div className="space-y-4 py-4">
                                <div className="rounded-lg bg-muted p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">Invoice #{selectedInvoice.invoiceNumber}</span>
                                        {getStatusBadge(selectedInvoice.status)}
                                    </div>
                                    <div className="text-sm space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Customer:</span>
                                            <span className="font-medium">{selectedInvoice.contact.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Amount:</span>
                                            <span className="font-bold text-lg">
                                                {selectedInvoice.amount.toFixed(2)} {selectedInvoice.currency}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Due Date:</span>
                                            <span>{format(new Date(selectedInvoice.dueDate), "MMM dd, yyyy")}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                                    <p className="font-semibold mb-1">Message Preview:</p>
                                    <p className="whitespace-pre-line">
                                        🧾 INVOICE {selectedInvoice.invoiceNumber}\n\n
                                        👤 Customer: {selectedInvoice.contact.name}\n
                                        💰 Amount: {selectedInvoice.amount.toFixed(2)} {selectedInvoice.currency}\n
                                        📅 Due Date: {format(new Date(selectedInvoice.dueDate), "MMM dd, yyyy")}
                                    </p>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSendDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleSendInvoice}>
                                <Send className="mr-2 h-4 w-4" />
                                Send to WhatsApp
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View Invoice Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
                        <DialogHeader className="sr-only">
                            <DialogTitle>Invoice Details - {viewInvoice?.invoiceNumber || 'Invoice'}</DialogTitle>
                        </DialogHeader>
                        {viewInvoice && (
                            <div className="flex flex-col h-[85vh]">
                                <div className="p-6 overflow-y-auto flex-1">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10">
                                                <Receipt className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <h1 className="text-xl font-bold tracking-tight text-primary">Meras CRM</h1>
                                                <p className="text-sm text-muted-foreground">Invoice #{viewInvoice.invoiceNumber}</p>
                                            </div>
                                        </div>
                                        {getStatusBadge(viewInvoice.status)}
                                    </div>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-8 mb-8 p-6 bg-white dark:bg-zinc-800/50 rounded-xl border border-border/50">
                                        <div>
                                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bill To</h3>
                                            <div className="space-y-1">
                                                <p className="font-semibold text-lg">{viewInvoice.contact.name}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span>{viewInvoice.contact.phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-4">
                                            <div>
                                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Invoice Date</h3>
                                                <p className="font-medium">{format(new Date(viewInvoice.createdAt), "MMM dd, yyyy")}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Due Date</h3>
                                                <p className="font-medium text-red-500">{format(new Date(viewInvoice.dueDate), "MMM dd, yyyy")}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="mb-8">
                                        <h3 className="text-sm font-semibold mb-4">Invoice Items</h3>
                                        <div className="rounded-xl border bg-white dark:bg-zinc-800/50 overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/50">
                                                        <TableHead className="pl-4">Description</TableHead>
                                                        <TableHead className="text-right pr-4">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell className="pl-4 font-medium">
                                                            {viewInvoice.items && viewInvoice.items.length > 0
                                                                ? viewInvoice.items[0].description
                                                                : "Invoice Payment"}
                                                        </TableCell>
                                                        <TableCell className="text-right pr-4">
                                                            {viewInvoice.amount.toFixed(2)} {viewInvoice.currency}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {/* Total */}
                                    <div className="flex justify-end mb-8">
                                        <div className="w-1/2 bg-primary/5 rounded-xl p-6">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-semibold">Total Amount</span>
                                                <span className="text-2xl font-bold text-primary">
                                                    {viewInvoice.amount.toFixed(2)} {viewInvoice.currency}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="text-center text-sm text-muted-foreground pt-8 border-t">
                                        <p>Thank you for your business!</p>
                                        <p className="mt-1">Please make payment by the due date.</p>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="p-4 border-t bg-white dark:bg-zinc-900 sticky bottom-0 flex justify-between gap-4">
                                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                                        Close
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => handleGeneratePDF(viewInvoice)}>
                                            <Download className="mr-2 h-4 w-4" />
                                            Download PDF
                                        </Button>
                                        <Button onClick={() => openSendDialog(viewInvoice)}>
                                            <Send className="mr-2 h-4 w-4" />
                                            Send to WhatsApp
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    )
}
