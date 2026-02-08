"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Building2, Phone, Mail, MapPin, Edit, Trash2, MoreVertical, Search } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Branch {
    id: string
    name: string
    address?: string
    phone?: string
    email?: string
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export default function BranchesPage() {
    const { t } = useI18n()
    const { toast } = useToast()
    const [branches, setBranches] = useState<Branch[]>([])
    const [registeredAccounts, setRegisteredAccounts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phone: "",
        email: "",
        isActive: true,
    })
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [branchToDelete, setBranchToDelete] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        fetchBranches()
        fetchRegisteredAccounts()
    }, [])

    const fetchRegisteredAccounts = async () => {
        try {
            const response = await fetch('/api/whatsapp/accounts')
            const data = await response.json()
            if (data.success) {
                setRegisteredAccounts(data.accounts)
            }
        } catch (error) {
            console.error('Error fetching WhatsApp accounts:', error)
        }
    }

    const fetchBranches = async () => {
        try {
            setIsLoading(true)
            const response = await fetch("/api/branches")
            const data = await response.json()
            if (data.success) {
                setBranches(data.branches)
            }
        } catch (error) {
            console.error("Error fetching branches:", error)
            toast({
                title: "Error",
                description: "Failed to load branches",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingBranch ? `/api/branches/${editingBranch.id}` : "/api/branches"
            const method = editingBranch ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            const data = await response.json()
            if (data.success) {
                toast({
                    title: "Success",
                    description: editingBranch ? "Branch updated successfully" : "Branch created successfully",
                })
                setIsDialogOpen(false)
                resetForm()
                fetchBranches()
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to save branch",
                variant: "destructive",
            })
        }
    }

    const handleDelete = async (id: string) => {
        setBranchToDelete(id)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!branchToDelete) return

        try {
            console.log('Attempting to delete branch:', branchToDelete)
            const response = await fetch(`/api/branches/${branchToDelete}`, { method: "DELETE" })
            const data = await response.json()

            console.log('Delete response:', data)

            if (data.success) {
                toast({
                    title: "Success",
                    description: "Branch deleted successfully",
                })
                fetchBranches()
            } else {
                console.error('Delete failed:', data.error)
                throw new Error(data.error || 'Failed to delete branch')
            }
        } catch (error) {
            console.error('Delete error:', error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete branch",
                variant: "destructive",
            })
        } finally {
            setDeleteDialogOpen(false)
            setBranchToDelete(null)
        }
    }

    const resetForm = () => {
        setFormData({
            name: "",
            address: "",
            phone: "",
            email: "",
            isActive: true,
        })
        setEditingBranch(null)
    }

    const openEditDialog = (branch: Branch) => {
        setEditingBranch(branch)
        setFormData({
            name: branch.name,
            address: branch.address || "",
            phone: branch.phone || "",
            email: branch.email || "",
            isActive: branch.isActive,
        })
        setIsDialogOpen(true)
    }

    const filteredBranches = branches.filter((branch) =>
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.phone?.includes(searchQuery) ||
        branch.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <AppLayout title={t("branches")}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold tracking-tight">{t("branches")}</h2>
                            <Badge variant="outline" className="text-sm px-2.5 py-0.5 h-7">
                                Total: {filteredBranches.length}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t("search") || "Search branches..."}
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
                                <Button className="gap-2 shadow-lg hover:shadow-xl transition-all h-9">
                                    <Plus className="h-4 w-4" />
                                    {t("addBranch")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <form onSubmit={handleSubmit}>
                                    <DialogHeader>
                                        <DialogTitle>{editingBranch ? "Edit Branch" : t("addBranch")}</DialogTitle>
                                        <DialogDescription>
                                            {editingBranch ? "Update branch information" : "Add a new branch location"}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">{t("branchName")} *</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                placeholder="Ex: Main Office"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="address">{t("address")}</Label>
                                            <Input
                                                id="address"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="Ex: 123 Business St, City"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="phone">{t("phone")}</Label>
                                            <Select
                                                value={formData.phone}
                                                onValueChange={(value) => setFormData({ ...formData, phone: value })}
                                            >
                                                <SelectTrigger id="phone">
                                                    <SelectValue placeholder="Select a registered number" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {registeredAccounts.length > 0 ? (
                                                        registeredAccounts.map((acc) => (
                                                            <SelectItem key={acc.id} value={acc.phone}>
                                                                {acc.name} ({acc.phone})
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="p-2 text-sm text-muted-foreground text-center">
                                                            No WhatsApp accounts found
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            {registeredAccounts.length === 0 && (
                                                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
                                                    <span className="text-amber-500">⚠</span>
                                                    Please connect a WhatsApp account first in Manage page.
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">{t("email")}</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="Ex: contact@company.com"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="isActive" className="text-base">{t("active")}</Label>
                                                <p className="text-sm text-muted-foreground">Enable or disable this branch</p>
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
                                        <Button type="submit">{t("save")}</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Branches Table */}
                <Card className="rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-0">
                        {isLoading ? (
                            <div className="flex h-64 items-center justify-center">
                                <div className="text-center">
                                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                                    <p className="mt-4 text-sm text-muted-foreground">{t("loading")}</p>
                                </div>
                            </div>
                        ) : filteredBranches.length === 0 ? (
                            <div className="flex h-96 flex-col items-center justify-center p-8 text-center">
                                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/30 mb-6">
                                    <Building2 className="h-10 w-10 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-lg font-semibold">
                                    {searchQuery ? "No matching branches found" : "No branches found"}
                                </h3>
                                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                                    {searchQuery ? "Try adjusting your search terms" : "Get started by adding your first branch location."}
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
                                        {t("addBranch")}
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead className="w-[20%]">{t("branchName")}</TableHead>
                                        <TableHead className="w-[100px]">{t("status")}</TableHead>
                                        <TableHead className="w-[25%]">{t("contact")}</TableHead>
                                        <TableHead>{t("address")}</TableHead>
                                        <TableHead className="text-right w-[80px]">{t("actions") || "Actions"}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBranches.map((branch, index) => (
                                        <TableRow key={branch.id} className="group">
                                            <TableCell className="text-muted-foreground font-medium">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                        <Building2 className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold">{branch.name}</div>
                                                        <div className="text-xs text-muted-foreground">ID: {branch.id.slice(0, 8)}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {branch.isActive ? (
                                                    <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-none shadow-none font-normal">
                                                        {t("active")}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-muted-foreground bg-muted font-normal">
                                                        {t("inactive")}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 text-sm">
                                                    {branch.phone && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Phone className="h-3.5 w-3.5" />
                                                            <span>{branch.phone}</span>
                                                        </div>
                                                    )}
                                                    {branch.email && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Mail className="h-3.5 w-3.5" />
                                                            <span>{branch.email}</span>
                                                        </div>
                                                    )}
                                                    {!branch.phone && !branch.email && (
                                                        <span className="text-muted-foreground/50 text-xs">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {branch.address ? (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        <span className="truncate max-w-[200px]" title={branch.address}>
                                                            {branch.address}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/50 text-xs">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[160px]">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => openEditDialog(branch)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            {t("edit")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(branch.id)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            {t("delete")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the branch
                            and unlink any associated WhatsApp accounts.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    )
}
