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
import { authenticatedFetch } from "@/lib/auth"
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
    const { t, dir } = useI18n()
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
            const response = await authenticatedFetch('/api/whatsapp/accounts')
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
            const response = await authenticatedFetch("/api/branches")
            const data = await response.json()
            if (data.success) {
                setBranches(data.branches)
            }
        } catch (error) {
            console.error("Error fetching branches:", error)
            toast({
                title: t("error"),
                description: t("failedToLoadBranches"),
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

            const response = await authenticatedFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            const data = await response.json()
            if (data.success) {
                toast({
                    title: t("success"),
                    description: editingBranch ? t("branchUpdatedSuccess") : t("branchCreatedSuccess"),
                })
                setIsDialogOpen(false)
                resetForm()
                fetchBranches()
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            toast({
                title: t("error"),
                description: error instanceof Error ? error.message : t("failedToSaveBranch"),
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
            const response = await authenticatedFetch(`/api/branches/${branchToDelete}`, { method: "DELETE" })
            const data = await response.json()

            console.log('Delete response:', data)

            if (data.success) {
                toast({
                    title: t("success"),
                    description: t("branchDeletedSuccess"),
                })
                fetchBranches()
            } else {
                console.error("Delete failed:", data.error)
                throw new Error(data.error || t("failedToDeleteBranch"))
            }
        } catch (error) {
            console.error("Delete error:", error)
            toast({
                title: t("error"),
                description: error instanceof Error ? error.message : t("failedToDeleteBranch"),
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
                                {t("total")}: {filteredBranches.length}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t("searchBranches")}
                                className="ps-9 h-9 text-start"
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
                                        <DialogTitle>{editingBranch ? t("editBranch") : t("addBranch")}</DialogTitle>
                                        <DialogDescription>
                                            {editingBranch ? t("updateBranchInfo") : t("addNewBranchLocation")}
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
                                                placeholder={t("mainBranch")}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="address">{t("address")}</Label>
                                            <Input
                                                id="address"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                placeholder={t("address")}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="phone">{t("phone")}</Label>
                                            <Select
                                                value={formData.phone}
                                                onValueChange={(value) => setFormData({ ...formData, phone: value })}
                                            >
                                                <SelectTrigger id="phone">
                                                    <SelectValue placeholder={t("selectPlaceholder")} />
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
                                                            {t("noWhatsAppAccountsFound")}
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            {registeredAccounts.length === 0 && (
                                                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
                                                    <span className="text-amber-500">⚠</span>
                                                    {t("connectWhatsAppFirst")}
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
                                                placeholder={t("placeholderEmailExample")}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="isActive" className="text-base">{t("active")}</Label>
                                                <p className="text-sm text-muted-foreground">{t("enableOrDisableBranch")}</p>
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
                                    {searchQuery ? t("noMatchingBranches") : t("noBranchesFound")}
                                </h3>
                                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                                    {searchQuery ? t("tryAdjustingSearch") : t("getStartedAddingBranch")}
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
                                        <Plus className="me-2 h-4 w-4" />
                                        {t("addBranch")}
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <>
                            {/* Mobile card view */}
                            <div className="md:hidden space-y-3 p-4">
                                {filteredBranches.map((branch, index) => (
                                    <div key={branch.id} className="rounded-xl border bg-card p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                                                    <Building2 className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold truncate">{branch.name}</div>
                                                    <div className="text-xs text-muted-foreground">ID: {branch.id.slice(0, 8)}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {branch.isActive ? (
                                                    <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-none shadow-none font-normal text-xs">
                                                        {t("active")}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-muted-foreground bg-muted font-normal text-xs">
                                                        {t("inactive")}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 text-sm">
                                            {branch.phone && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Phone className="h-3.5 w-3.5 shrink-0" />
                                                    <span>{branch.phone}</span>
                                                </div>
                                            )}
                                            {branch.email && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Mail className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="truncate">{branch.email}</span>
                                                </div>
                                            )}
                                            {branch.address && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="truncate">{branch.address}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-end gap-2 pt-1 border-t">
                                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openEditDialog(branch)}>
                                                <Edit className="me-1.5 h-3.5 w-3.5" />
                                                {t("edit")}
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(branch.id)}>
                                                <Trash2 className="me-1.5 h-3.5 w-3.5" />
                                                {t("delete")}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop table view */}
                            <div className="hidden md:block table-scroll">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead className="w-[20%] min-w-[180px]">{t("branchName")}</TableHead>
                                        <TableHead className="w-[100px]">{t("status")}</TableHead>
                                        <TableHead className="w-[25%] min-w-[160px]">{t("contact")}</TableHead>
                                        <TableHead className="min-w-[150px]">{t("address")}</TableHead>
                                        <TableHead className="text-end w-[80px]">{t("actionsLabel")}</TableHead>
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
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                                                        <Building2 className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-semibold truncate">{branch.name}</div>
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
                                                            <Phone className="h-3.5 w-3.5 shrink-0" />
                                                            <span>{branch.phone}</span>
                                                        </div>
                                                    )}
                                                    {branch.email && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Mail className="h-3.5 w-3.5 shrink-0" />
                                                            <span className="truncate">{branch.email}</span>
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
                                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                        <span className="truncate max-w-[250px]" title={branch.address}>
                                                            {branch.address}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/50 text-xs">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-end">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="sr-only">{t("actionsLabel")}</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align={dir === "rtl" ? "start" : "end"} className="w-[160px]">
                                                        <DropdownMenuLabel>{t("actionsLabel")}</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => openEditDialog(branch)}>
                                                            <Edit className="me-2 h-4 w-4" />
                                                            {t("edit")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(branch.id)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="me-2 h-4 w-4" />
                                                            {t("delete")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            </div>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteBranchConfirmDesc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    )
}
