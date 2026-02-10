"use client"

import { useState, useEffect } from "react"
import { getUserRole, authenticatedFetch } from "@/lib/auth"
import { AppLayout } from "@/components/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { Download, Search, MoreHorizontal, User, Calendar, Shield, ShieldAlert } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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

interface Booking {
    id: string
    bookingNumber: string
    contactId: string
    contact: {
        id: string
        name: string
        phone: string
        email?: string
    }
    agentId?: string
    agent?: {
        id: string
        name: string
        email: string
    }
    branch?: string
    status: string
    date: string
    notes?: string
    createdAt: string
    updatedAt: string
}

export default function BookingsPage() {
    const { toast } = useToast()
    const { t } = useI18n()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const actualRole = getUserRole()
    const isAgentOrSupervisor = actualRole === "AGENT" || actualRole === "SUPERVISOR"

    // Role Simulation State
    const [userRole, setUserRole] = useState<'ADMIN' | 'EMPLOYEE'>('ADMIN')
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)

    // Dialog States
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
    const [currentAction, setCurrentAction] = useState("")
    const [selectedBookingId, setSelectedBookingId] = useState("")

    // Form States
    const [editReason, setEditReason] = useState("")
    const [agents, setAgents] = useState<{ id: string; name: string; role: string }[]>([])
    const [editAgentId, setEditAgentId] = useState<string>("")
    const [editNotes, setEditNotes] = useState<string>("")

    useEffect(() => {
        fetchBookings()
        fetchAgents()
    }, [])

    const fetchAgents = async () => {
        try {
            const response = await authenticatedFetch('/api/users/agents')
            const data = await response.json()
            if (data.success) {
                setAgents(data.data)
            }
        } catch (error) {
            console.error('Error fetching agents:', error)
        }
    }

    const fetchBookings = async () => {
        try {
            setIsLoading(true)
            const response = await authenticatedFetch('/api/bookings')
            const data = await response.json()

            if (data.success) {
                setBookings(data.data)
            } else {
                toast({
                    title: t("error"),
                    description: t("failedToLoadBookings"),
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error("Error fetching bookings:", error)
            toast({
                title: t("error"),
                description: t("failedToConnectToServer"),
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const filteredBookings = bookings.filter(booking =>
        booking.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (booking.agent?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    const selectedBooking = bookings.find(b => b.bookingNumber === selectedBookingId)

    const handleExport = () => {
        toast({
            title: t("exportingData"),
            description: t("bookingsExportingToExcel"),
        })
    }

    const confirmCancel = async () => {
        try {
            const response = await authenticatedFetch(`/api/bookings/${selectedBookingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CANCELLED' })
            })

            const data = await response.json()

            if (data.success) {
                setBookings(prev => prev.map(b =>
                    b.bookingNumber === selectedBookingId ? { ...b, status: "CANCELLED" } : b
                ))
                toast({
                    title: t("bookingCancelled"),
                    description: t("bookingCancelledMessage").replace("{id}", selectedBookingId),
                    variant: "destructive"
                })
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            console.error("Error cancelling booking:", error)
            toast({
                title: t("error"),
                description: t("failedToCancelBooking"),
                variant: "destructive"
            })
        }
        setIsCancelDialogOpen(false)
    }

    const initiateCancel = (id: string) => {
        setSelectedBookingId(id)
        setIsCancelDialogOpen(true)
    }

    const handleAction = (action: string, id: string) => {
        setCurrentAction(action)
        setSelectedBookingId(id)
        setEditReason("") // Reset form
        const booking = bookings.find(b => b.bookingNumber === id)
        if (booking) {
            setEditAgentId(booking.agentId || "")
            setEditNotes(booking.notes || "")
        }
        setIsDialogOpen(true)
    }

    const handleSubmitRequest = async () => {
        try {
            const response = await authenticatedFetch('/api/notifications/send-to-admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: "Booking Request Update",
                    message: `Booking ${selectedBookingId}: ${editReason || "No details provided"}`,
                    type: "INFO",
                    link: "/bookings"
                })
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: t("requestSent"),
                    description: t("editRequestSentToAdmin"),
                })
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            console.error("Error sending request:", error)
            toast({
                title: t("errorSendingRequest"),
                description: t("failedToNotifyAdmin"),
                variant: "destructive"
            })
        }
        setIsDialogOpen(false)
    }

    const handleSaveEdit = async () => {
        try {
            const booking = bookings.find(b => b.bookingNumber === selectedBookingId)
            if (!booking) {
                toast({
                    title: t("error"),
                    description: t("bookingNotFound"),
                    variant: "destructive"
                })
                return
            }

            const response = await authenticatedFetch(`/api/bookings/${booking.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: editAgentId || null,
                    notes: editNotes || null
                })
            })

            const data = await response.json()

            if (data.success) {
                // Refresh bookings to get updated data
                await fetchBookings()
                toast({
                    title: t("changesSaved"),
                    description: t("bookingUpdatedSuccess"),
                })
                setIsDialogOpen(false)
            } else {
                throw new Error(data.error || t("failedToUpdateBooking"))
            }
        } catch (error) {
            console.error("Error updating booking:", error)
            toast({
                title: t("error"),
                description: error instanceof Error ? error.message : t("failedToUpdateBooking"),
                variant: "destructive"
            })
        }
    }

    return (
        <AppLayout title={t("bookings")}>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight">{t("yourBookings")}</h2>
                        <Badge variant="outline" className="text-sm px-2.5 py-0.5 h-7">
                            {t("total")}: {filteredBookings.length}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Role Simulator Toggle */}
                        {/* Admin/Employee View Toggle - Only for ADMIN and SUPERVISOR */}
                        {getUserRole() !== 'AGENT' && (
                            <Button
                                variant={userRole === 'ADMIN' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                    if (userRole === 'ADMIN') {
                                        setIsRoleDialogOpen(true)
                                    } else {
                                        setUserRole('ADMIN')
                                    }
                                }}
                                className="me-2"
                            >
                                {userRole === "ADMIN" ? <Shield className="me-2 h-4 w-4" /> : <User className="me-2 h-4 w-4" />}
                                {userRole === "ADMIN" ? t("adminView") : t("employeeView")}
                            </Button>
                        )}

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t("searchBookings")}
                                className="ps-9 h-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={handleExport}>
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">{t("exportExcel")}</span>
                        </Button>
                    </div>
                </div>

                {/* Table Section */}
                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground border rounded-lg bg-card">
                            {t("noBookingsFound")}
                        </div>
                    ) : (
                        filteredBookings.map((booking) => (
                            <div key={booking.id} className="bg-card border rounded-xl p-4 shadow-sm active:bg-accent/50 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm text-primary font-bold shrink-0">
                                            {booking.contact.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm line-clamp-1">{booking.contact.name}</h4>
                                            <span className="text-xs text-muted-foreground">{booking.bookingNumber}</span>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={
                                            booking.status === 'CONFIRMED' ? 'default' :
                                                booking.status === 'PENDING' ? 'secondary' :
                                                    booking.status === 'CANCELLED' ? 'destructive' : 'outline'
                                        }
                                        className={
                                            booking.status === 'CONFIRMED' ? 'bg-green-500 text-white' :
                                                booking.status === 'PENDING' ? 'bg-yellow-500 text-white' : ''
                                        }
                                    >
                                        {booking.status}
                                    </Badge>
                                </div>

                                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 shrink-0" />
                                        <span>{format(new Date(booking.date), "MMM d, yyyy • h:mm a")}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 shrink-0" />
                                        <span>{booking.agent?.name || t("unassigned")}</span>
                                    </div>
                                    {booking.notes && (
                                        <p className="text-xs bg-muted/50 p-2 rounded line-clamp-2">
                                            {booking.notes}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => handleAction("View Details", booking.bookingNumber)}>
                                        {t("viewDetails")}
                                    </Button>
                                    {!isAgentOrSupervisor && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 border">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleAction("Edit Booking", booking.bookingNumber)}>
                                                    {t("editBooking")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => initiateCancel(booking.bookingNumber)}
                                                >
                                                    {t("cancelBooking")}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop View */}
                <div className="border rounded-md bg-card hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>{t("customerLabel")}</TableHead>
                                <TableHead>{t("branchLabel")}</TableHead>
                                <TableHead>{t("agent")}</TableHead>
                                <TableHead>{t("notes")}</TableHead>
                                <TableHead>{t("dateLabel")}</TableHead>
                                <TableHead>{t("status")}</TableHead>
                                {!isAgentOrSupervisor && (
                                    <TableHead className="text-end">{t("actionsLabel")}</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={isAgentOrSupervisor ? 7 : 8} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                            <span className="text-muted-foreground">{t("loadingBookings")}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredBookings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isAgentOrSupervisor ? 7 : 8} className="h-24 text-center text-muted-foreground">
                                        {t("noBookingsFound")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBookings.map((booking) => (
                                    <TableRow key={booking.id}>
                                        <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-bold">
                                                    {booking.contact.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <span>{booking.contact.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{booking.branch || '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-muted-foreground text-sm">
                                                <User className="me-1 h-3 w-3" />
                                                {booking.agent?.name || t("unassigned")}
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={booking.notes}>
                                            <span className="text-sm text-muted-foreground">
                                                {booking.notes || "-"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span className="flex items-center">
                                                    <Calendar className="me-1 h-3 w-3 text-muted-foreground" />
                                                    {format(new Date(booking.date), "MMM d, yyyy")}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground pl-4">
                                                    {format(new Date(booking.date), "h:mm a")}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    booking.status === 'CONFIRMED' ? 'default' :
                                                        booking.status === 'PENDING' ? 'secondary' :
                                                            booking.status === 'CANCELLED' ? 'destructive' : 'outline'
                                                }
                                                className={
                                                    booking.status === 'CONFIRMED' ? 'bg-green-500 hover:bg-green-600' :
                                                        booking.status === 'PENDING' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''
                                                }
                                            >
                                                {booking.status}
                                            </Badge>
                                        </TableCell>
                                        {!isAgentOrSupervisor && (
                                            <TableCell className="text-end">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleAction("View Details", booking.bookingNumber)}>
                                                            {t("viewDetails")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleAction("Edit Booking", booking.bookingNumber)}>
                                                            {t("editBooking")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={() => initiateCancel(booking.bookingNumber)}
                                                        >
                                                            {t("cancelBooking")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Main Action Dialog (View/Edit) */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>
                                {currentAction === "View Details" ? t("bookingDetails") :
                                    userRole === "ADMIN" ? t("editBooking") : t("requestBookingUpdate")}
                            </DialogTitle>
                            <DialogDescription>
                                {currentAction === "View Details" ? t("fullDetailsForBooking") :
                                    userRole === "ADMIN" ? t("updateBookingDirectly") : t("submitRequestToAdmin")}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedBooking && currentAction === "View Details" && (
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-end font-semibold">ID</Label>
                                    <div className="col-span-3">{selectedBooking.id}</div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-end font-semibold">{t("customerLabel")}</Label>
                                    <div className="col-span-3">{selectedBooking.contact.name}</div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-end font-semibold">{t("agent")}</Label>
                                    <div className="col-span-3">{selectedBooking.agent?.name || t("unassigned")}</div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-end font-semibold">{t("status")}</Label>
                                    <div className="col-span-3">
                                        <Badge variant="outline">{selectedBooking.status}</Badge>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label className="text-end font-semibold pt-2">{t("notes")}</Label>
                                    <div className="col-span-3 p-3 bg-muted/50 rounded-md text-sm">
                                        {selectedBooking.notes || t("noNotesAvailable")}
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedBooking && currentAction === "Edit Booking" && userRole === "ADMIN" && (
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="customer">{t("customerName")}</Label>
                                    <Input id="customer" value={selectedBooking.contact.name} disabled />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="agent">{t("assignedAgent")}</Label>
                                    <Select value={editAgentId || "unassigned"} onValueChange={(value) => setEditAgentId(value === "unassigned" ? "" : value)}>
                                        <SelectTrigger id="agent">
                                            <SelectValue placeholder={t("selectAnAgent")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">{t("unassigned")}</SelectItem>
                                            {agents.map((agent) => (
                                                <SelectItem key={agent.id} value={agent.id}>
                                                    {agent.name} ({agent.role})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="notes">{t("bookingNotes")}</Label>
                                    <Textarea
                                        id="notes"
                                        value={editNotes}
                                        onChange={(e) => setEditNotes(e.target.value)}
                                        placeholder={t("addBookingNotesPlaceholder")}
                                    />
                                </div>
                            </div>
                        )}

                        {selectedBooking && currentAction === "Edit Booking" && userRole === "EMPLOYEE" && (
                            <div className="grid gap-4 py-4">
                                <div className="bg-yellow-500/10 text-yellow-600 p-3 rounded-md text-sm flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4" />
                                    {t("onlyAdminsCanEdit")}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="request">{t("reasonForChange")}</Label>
                                    <Textarea
                                        id="request"
                                        placeholder={t("reasonPlaceholder")}
                                        value={editReason}
                                        onChange={(e) => setEditReason(e.target.value)}
                                        className="h-32"
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            {currentAction === "View Details" ? (
                                <Button onClick={() => setIsDialogOpen(false)}>{t("close")}</Button>
                            ) : userRole === "ADMIN" ? (
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t("cancel")}</Button>
                                    <Button onClick={handleSaveEdit}>{t("saveChangesLabel")}</Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t("cancel")}</Button>
                                    <Button onClick={handleSubmitRequest}>{t("sendRequest")}</Button>
                                </div>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Cancel Confirmation Dialog */}
                <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle className="text-red-600 flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5" />
                                {t("cancelBookingTitle")}
                            </DialogTitle>
                            <DialogDescription>
                                {t("cancelBookingConfirm")}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={() => setIsCancelDialogOpen(false)}>{t("thinkingAboutIt")}</Button>
                            <Button variant="destructive" onClick={confirmCancel}>{t("yesCancelBooking")}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <AlertDialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("switchToEmployeeView")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("switchToEmployeeViewDesc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setUserRole("EMPLOYEE")
                            setIsRoleDialogOpen(false)
                        }}>
                            {t("switchToEmployee")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    )
}
