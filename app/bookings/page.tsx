"use client"

import { useState, useEffect } from "react"
import { getUserRole } from "@/lib/auth"
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
            const response = await fetch('/api/users/agents')
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
            const response = await fetch('/api/bookings')
            const data = await response.json()

            if (data.success) {
                setBookings(data.data)
            } else {
                toast({
                    title: "Error",
                    description: "Failed to load bookings",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error fetching bookings:', error)
            toast({
                title: "Error",
                description: "Failed to connect to server",
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
            title: "Exporting Data",
            description: "Your bookings are being exported to Excel...",
        })
    }

    const confirmCancel = async () => {
        try {
            const response = await fetch(`/api/bookings/${selectedBookingId}`, {
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
                    title: "Booking Cancelled",
                    description: `Booking ${selectedBookingId} has been cancelled successfully.`,
                    variant: "destructive"
                })
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            console.error('Error cancelling booking:', error)
            toast({
                title: "Error",
                description: "Failed to cancel booking",
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
            const response = await fetch('/api/notifications/send-to-admins', {
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
                    title: "Request Sent",
                    description: `Your edit request for ${selectedBookingId} has been sent to the Admin.`,
                })
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            console.error("Error sending request:", error)
            toast({
                title: "Error Sending Request",
                description: "Failed to notify admin. Please try again.",
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
                    title: "Error",
                    description: "Booking not found",
                    variant: "destructive"
                })
                return
            }

            const response = await fetch(`/api/bookings/${booking.id}`, {
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
                    title: "Changes Saved",
                    description: `Booking ${selectedBookingId} updated successfully.`,
                })
                setIsDialogOpen(false)
            } else {
                throw new Error(data.error || "Failed to update booking")
            }
        } catch (error) {
            console.error('Error updating booking:', error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update booking",
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
                        <h2 className="text-2xl font-bold tracking-tight">Your Bookings</h2>
                        <Badge variant="outline" className="text-sm px-2.5 py-0.5 h-7">
                            Total: {filteredBookings.length}
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
                                className="mr-2"
                            >
                                {userRole === 'ADMIN' ? <Shield className="mr-2 h-4 w-4" /> : <User className="mr-2 h-4 w-4" />}
                                {userRole === 'ADMIN' ? 'Admin View' : 'Employee View'}
                            </Button>
                        )}

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search bookings..."
                                className="pl-9 h-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={handleExport}>
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Export Excel</span>
                        </Button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="border rounded-md bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Agent</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                            <span className="text-muted-foreground">Loading bookings...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredBookings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        No bookings found.
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
                                                <User className="mr-1 h-3 w-3" />
                                                {booking.agent?.name || 'Unassigned'}
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
                                                    <Calendar className="mr-1 h-3 w-3 text-muted-foreground" />
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
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleAction("View Details", booking.bookingNumber)}>
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction("Edit Booking", booking.bookingNumber)}>
                                                        Edit Booking
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600"
                                                        onClick={() => initiateCancel(booking.bookingNumber)}
                                                    >
                                                        Cancel Booking
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
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
                                {currentAction === "View Details" ? "Booking Details" :
                                    userRole === 'ADMIN' ? "Edit Booking" : "Request Booking Update"}
                            </DialogTitle>
                            <DialogDescription>
                                {currentAction === "View Details" ? "Full details for the selected booking." :
                                    userRole === 'ADMIN' ? "Update booking information directly." :
                                        "Submit a request to the admin for changes."}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedBooking && currentAction === "View Details" && (
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-semibold">ID</Label>
                                    <div className="col-span-3">{selectedBooking.id}</div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-semibold">Customer</Label>
                                    <div className="col-span-3">{selectedBooking.contact.name}</div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-semibold">Agent</Label>
                                    <div className="col-span-3">{selectedBooking.agent?.name || 'Unassigned'}</div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-semibold">Status</Label>
                                    <div className="col-span-3">
                                        <Badge variant="outline">{selectedBooking.status}</Badge>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label className="text-right font-semibold pt-2">Notes</Label>
                                    <div className="col-span-3 p-3 bg-muted/50 rounded-md text-sm">
                                        {selectedBooking.notes || "No notes available."}
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedBooking && currentAction === "Edit Booking" && userRole === 'ADMIN' && (
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="customer">Customer Name</Label>
                                    <Input id="customer" value={selectedBooking.contact.name} disabled />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="agent">Assigned Agent</Label>
                                    <Select value={editAgentId || "unassigned"} onValueChange={(value) => setEditAgentId(value === "unassigned" ? "" : value)}>
                                        <SelectTrigger id="agent">
                                            <SelectValue placeholder="Select an agent" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                            {agents.map((agent) => (
                                                <SelectItem key={agent.id} value={agent.id}>
                                                    {agent.name} ({agent.role})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="notes">Booking Notes</Label>
                                    <Textarea 
                                        id="notes" 
                                        value={editNotes}
                                        onChange={(e) => setEditNotes(e.target.value)}
                                        placeholder="Add booking notes..."
                                    />
                                </div>
                            </div>
                        )}

                        {selectedBooking && currentAction === "Edit Booking" && userRole === 'EMPLOYEE' && (
                            <div className="grid gap-4 py-4">
                                <div className="bg-yellow-500/10 text-yellow-600 p-3 rounded-md text-sm flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4" />
                                    Only Admins can edit directly. Send a request below.
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="request">Reason for Change / New Details</Label>
                                    <Textarea
                                        id="request"
                                        placeholder="e.g. Customer wants to reschedule to next Monday..."
                                        value={editReason}
                                        onChange={(e) => setEditReason(e.target.value)}
                                        className="h-32"
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            {currentAction === "View Details" ? (
                                <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
                            ) : userRole === 'ADMIN' ? (
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleSaveEdit}>Save Changes</Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleSubmitRequest}>Send Request</Button>
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
                                Cancel Booking?
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to cancel booking <strong>{selectedBookingId}</strong>?
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={() => setIsCancelDialogOpen(false)}>Thinking About It</Button>
                            <Button variant="destructive" onClick={confirmCancel}>Yes, Cancel Booking</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <AlertDialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Switch to Employee View?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to switch to the Employee view. This will restrict your access to admin-only features.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setUserRole('EMPLOYEE')
                            setIsRoleDialogOpen(false)
                        }}>
                            Switch to Employee
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    )
}
