"use client"

import { useRouter } from "next/navigation"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { Search, Plus, MoreVertical, Shield, User as UserIcon, AlertCircle, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { authenticatedFetch } from "@/lib/auth"

interface User {
  id: string
  name: string
  username?: string | null
  email: string
  role: 'ADMIN' | 'SUPERVISOR' | 'AGENT'
  status: 'ONLINE' | 'OFFLINE' | 'AWAY'
  isActive?: boolean
  lastLoginAt?: string
  lastLogoutAt?: string
  createdAt: string
  branches?: { id: string, name: string }[]
  whatsappAccounts?: { id: string, name: string, phone: string }[]
}

export default function UsersPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [availableBranches, setAvailableBranches] = useState<{ value: string, label: string }[]>([])
  const [availableAccounts, setAvailableAccounts] = useState<{ value: string, label: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Form States
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "AGENT",
    status: "OFFLINE",
    branchIds: [] as string[],
    whatsappAccountIds: [] as string[]
  })

  useEffect(() => {
    fetchUsers()
    fetchMetadata()
  }, [])

  const fetchMetadata = async () => {
    try {
      // Fetch Branches
      const branchesRes = await authenticatedFetch('/api/branches')

      if (branchesRes.status === 401) {
        router.push('/login')
        return
      }

      const branchesData = await branchesRes.json()
      if (branchesData.success && branchesData.branches) {
        console.log('Fetched Branches:', branchesData.branches)
        setAvailableBranches((branchesData.branches || []).map((b: any) => ({ value: b.id, label: b.name })))
      }

      // Fetch WhatsApp Accounts
      const accountsRes = await authenticatedFetch('/api/whatsapp/accounts')

      if (accountsRes.status === 401) {
        router.push('/login')
        return
      }

      const accountsData = await accountsRes.json()
      if (accountsData.success && accountsData.accounts) {
        console.log('Fetched Accounts:', accountsData.accounts)
        setAvailableAccounts((accountsData.accounts || []).map((a: any) => ({ value: a.id, label: `${a.name} (${a.phone})` })))
      }
    } catch (error) {
      console.error('Error fetching metadata:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await authenticatedFetch('/api/users')

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()
      if (data.success) {
        setUsers(data.data || [])
      } else {
        setUsers([])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: t("error"),
        description: t("failedToLoadUsers"),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.username || !formData.email || !formData.password) {
      toast({ title: t("validationError"), description: t("pleaseFillRequiredFields"), variant: "destructive" })
      return
    }
    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(formData.username) || formData.username.length < 2 || formData.username.length > 50) {
      toast({ title: t("validationError"), description: t("usernameValidation"), variant: "destructive" })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await authenticatedFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()

      if (data.success) {
        setUsers([data.data, ...users])
        setIsAddDialogOpen(false)
        resetForm()
        toast({ title: t("success"), description: t("userCreatedSuccess") })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: t("error"), description: error.message || t("failedToCreateUser"), variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    try {
      setIsSubmitting(true)
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      const response = await authenticatedFetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name,
          username: formData.username || null,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          branchIds: formData.branchIds,
          whatsappAccountIds: formData.whatsappAccountIds,
          currentUserId: currentUser.id
        })
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()

      if (data.success) {
        setUsers(users.map(u => u.id === selectedUser.id ? data.data : u))
        setIsEditDialogOpen(false)
        setSelectedUser(null)
        resetForm()
        toast({ title: t("success"), description: t("userUpdatedSuccess") })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: t("error"), description: error.message || t("failedToUpdateUser"), variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      setIsSubmitting(true)
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      const response = await authenticatedFetch(`/api/users/${selectedUser.id}?currentUserId=${currentUser.id}`, {
        method: 'DELETE'
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()

      if (data.success) {
        setUsers(users.filter(u => u.id !== selectedUser.id))
        setIsDeleteDialogOpen(false)
        setSelectedUser(null)
        toast({ title: t("success"), description: t("userDeletedSuccess") })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: t("error"), description: error.message || t("failedToDeleteUser"), variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeactivateUser = async () => {
    if (!selectedUser) return

    const newActiveStatus = !selectedUser.isActive
    const action = newActiveStatus ? "activated" : "deactivated"

    try {
      setIsSubmitting(true)
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      const response = await authenticatedFetch(`/api/users/${selectedUser.id}/toggle-active`, {
        method: 'PUT',
        body: JSON.stringify({
          isActive: newActiveStatus,
          currentUserId: currentUser.id
        })
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()

      if (data.success) {
        setUsers(users.map(u => u.id === selectedUser.id ? { ...u, isActive: newActiveStatus } : u))
        setIsDeactivateDialogOpen(false)
        setSelectedUser(null)
        toast({ title: t("success"), description: t("userActionSuccess") })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: t("error"), description: error.message || t("failedToActionUser"), variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      username: "",
      email: "",
      password: "",
      role: "AGENT",
      status: "OFFLINE",
      branchIds: [],
      whatsappAccountIds: []
    })
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      username: user.username ?? "",
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
      branchIds: user.branches?.map(b => b.id) || [],
      whatsappAccountIds: user.whatsappAccounts?.map(w => w.id) || []
    })
    setIsEditDialogOpen(true)
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.username?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN": return <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">{t("admin")}</Badge>
      case "SUPERVISOR": return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">{t("supervisor")}</Badge>
      default: return <Badge variant="outline">{t("agentRole")}</Badge>
    }
  }

  return (
    <AppLayout title={t("users")}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">{t("userManagement")}</h2>
            <Badge variant="outline" className="text-sm px-2.5 py-0.5 h-7">
              {t("total")}: {users.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("searchUsers")}
                className="ps-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button size="sm" className="h-9" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
              <Plus className="me-2 h-4 w-4" />
              {t("addUser")}
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl bg-card shadow-soft">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <UserIcon className="h-12 w-12 mb-4 opacity-20" />
              <p>{t("noUsersFound")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>{t("userLabel")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("details")}</TableHead>
                  <TableHead>{t("createdAt")}</TableHead>
                  <TableHead>{t("activeLabel")}</TableHead>
                  <TableHead className="w-20">{t("options")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user, index) => (
                  <TableRow key={user.id} className="border-border/30 hover:bg-accent/50">
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'ONLINE' ? 'default' : user.status === 'AWAY' ? 'secondary' : 'outline'} className="rounded-full text-xs">
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {user.branches && user.branches.length > 0 && (
                          <span>{user.branches.length} {t("branches")}</span>
                        )}
                        {user.whatsappAccounts && user.whatsappAccounts.length > 0 && (
                          <span>{user.whatsappAccounts.length} WhatsApp</span>
                        )}
                        {(!user.branches?.length && !user.whatsappAccounts?.length) && (
                          <span>-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(user.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isActive !== false}
                        onCheckedChange={() => {
                          setSelectedUser(user)
                          setIsDeactivateDialogOpen(true)
                        }}
                        className="data-[state=checked]:bg-green-600"
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsDetailsDialogOpen(true); }}>
                            {t("userDetails")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            {t("editUser")}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedUser(user); setIsDeleteDialogOpen(true); }}>
                            {t("delete")} {t("userLabel")}
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

        {/* Add User Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("addNewUser")}</DialogTitle>
              <DialogDescription>{t("createNewUserDescription")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("fullName")}</Label>
                <Input id="name" placeholder={t("placeholderName")} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">{t("username")}</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder={t("placeholderUsername")}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/\s/g, '') })}
                  required
                />
                <p className="text-xs text-muted-foreground">Username must be unique. Letters, numbers and underscores only (no spaces).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("emailAddress")}</Label>
                <Input id="email" type="email" placeholder={t("placeholderEmailExample")} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("passwordLabel")}</Label>
                <Input id="password" type="password" placeholder={t("placeholderPasswordDots")} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("role")}</Label>
                  <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AGENT">{t("agentRole")}</SelectItem>
                      <SelectItem value="SUPERVISOR">{t("supervisor")}</SelectItem>
                      <SelectItem value="ADMIN">{t("admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("status")}</Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONLINE">{t("online")}</SelectItem>
                      <SelectItem value="AWAY">{t("away")}</SelectItem>
                      <SelectItem value="OFFLINE">{t("offline")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Branch Selection */}
              <div className="space-y-2">
                <Label>{t("assignedBranches")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {formData.branchIds.length > 0
                        ? t("branchesSelectedCount").replace("{n}", String(formData.branchIds.length))
                        : t("selectBranches")}
                      <ChevronDown className="ms-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="max-h-64 overflow-auto p-4 space-y-2">
                      {availableBranches.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("noBranchesAvailable")}</p>
                      ) : (
                        availableBranches.map((branch) => (
                          <div key={branch.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`branch-${branch.value}`}
                              checked={formData.branchIds.includes(branch.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({ ...formData, branchIds: [...formData.branchIds, branch.value] })
                                } else {
                                  setFormData({ ...formData, branchIds: formData.branchIds.filter(id => id !== branch.value) })
                                }
                              }}
                            />
                            <label htmlFor={`branch-${branch.value}`} className="text-sm cursor-pointer">
                              {branch.label}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* WhatsApp Account Selection */}
              <div className="space-y-2">
                <Label>{t("assignedWhatsAppAccounts")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {formData.whatsappAccountIds.length > 0
                        ? t("accountsSelectedCount").replace("{n}", String(formData.whatsappAccountIds.length))
                        : t("selectWhatsAppAccounts")}
                      <ChevronDown className="ms-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="max-h-64 overflow-auto p-4 space-y-2">
                      {availableAccounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("noWhatsAppAccountsAvailable")}</p>
                      ) : (
                        availableAccounts.map((account) => (
                          <div key={account.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`account-${account.value}`}
                              checked={formData.whatsappAccountIds.includes(account.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({ ...formData, whatsappAccountIds: [...formData.whatsappAccountIds, account.value] })
                                } else {
                                  setFormData({ ...formData, whatsappAccountIds: formData.whatsappAccountIds.filter(id => id !== account.value) })
                                }
                              }}
                            />
                            <label htmlFor={`account-${account.value}`} className="text-sm cursor-pointer">
                              {account.label}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)}>{t("cancel")}</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t("creating") : t("createUser")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("editUser")}</DialogTitle>
              <DialogDescription>{t("updateUserDetailsAndPermissions")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t("fullName")}</Label>
                <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  type="text"
                  autoComplete="username"
                  placeholder={t("placeholderUsername")}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/\s/g, '') })}
                />
                <p className="text-xs text-muted-foreground">Letters, numbers and underscores only. Must be unique.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">{t("emailAddress")}</Label>
                <Input id="edit-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("role")}</Label>
                  <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AGENT">{t("agentRole")}</SelectItem>
                      <SelectItem value="SUPERVISOR">{t("supervisor")}</SelectItem>
                      <SelectItem value="ADMIN">{t("admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("status")}</Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONLINE">{t("online")}</SelectItem>
                      <SelectItem value="AWAY">{t("away")}</SelectItem>
                      <SelectItem value="OFFLINE">{t("offline")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Branch Selection */}
              <div className="space-y-2">
                <Label>{t("assignedBranches")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {formData.branchIds.length > 0
                        ? t("branchesSelectedCount").replace("{n}", String(formData.branchIds.length))
                        : t("selectBranches")}
                      <ChevronDown className="ms-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="max-h-64 overflow-auto p-4 space-y-2">
                      {availableBranches.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("noBranchesAvailable")}</p>
                      ) : (
                        availableBranches.map((branch) => (
                          <div key={branch.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-branch-${branch.value}`}
                              checked={formData.branchIds.includes(branch.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({ ...formData, branchIds: [...formData.branchIds, branch.value] })
                                } else {
                                  setFormData({ ...formData, branchIds: formData.branchIds.filter(id => id !== branch.value) })
                                }
                              }}
                            />
                            <label htmlFor={`edit-branch-${branch.value}`} className="text-sm cursor-pointer">
                              {branch.label}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* WhatsApp Account Selection */}
              <div className="space-y-2">
                <Label>{t("assignedWhatsAppAccounts")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {formData.whatsappAccountIds.length > 0
                        ? t("accountsSelectedCount").replace("{n}", String(formData.whatsappAccountIds.length))
                        : t("selectWhatsAppAccounts")}
                      <ChevronDown className="ms-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="max-h-64 overflow-auto p-4 space-y-2">
                      {availableAccounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("noWhatsAppAccountsAvailable")}</p>
                      ) : (
                        availableAccounts.map((account) => (
                          <div key={account.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-account-${account.value}`}
                              checked={formData.whatsappAccountIds.includes(account.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({ ...formData, whatsappAccountIds: [...formData.whatsappAccountIds, account.value] })
                                } else {
                                  setFormData({ ...formData, whatsappAccountIds: formData.whatsappAccountIds.filter(id => id !== account.value) })
                                }
                              }}
                            />
                            <label htmlFor={`edit-account-${account.value}`} className="text-sm cursor-pointer">
                              {account.label}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>{t("cancel")}</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t("savingChanges") : t("saveChangesLabel")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t("deleteUserConfirm")}
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.name != null
                  ? t("deleteUserConfirmQuestion").replace("{name}", selectedUser.name) + " "
                  : ""}
                {t("deleteUserConfirmDesc")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>{t("cancel")}</Button>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>
                {isSubmitting ? t("deleting") : t("yesDeleteUser")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate/Activate Confirmation Dialog */}
        <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className={`${selectedUser?.isActive === false ? "text-green-600" : "text-orange-600"} flex items-center gap-2`}>
                <AlertCircle className="h-5 w-5" />
                {selectedUser?.isActive === false ? t("activateDeactivateUserTitle") : t("deactivateUserTitle")}
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.isActive === false ? t("activateUserConfirmDesc") : t("deactivateUserConfirmDesc")} <strong>{selectedUser?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDeactivateDialogOpen(false)}>{t("cancel")}</Button>
              <Button
                variant={selectedUser?.isActive === false ? "default" : "secondary"}
                onClick={handleDeactivateUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? t("processing") : (selectedUser?.isActive === false ? t("yesActivateUser") : t("yesDeactivateUser"))}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("userDetails")}</DialogTitle>
              <DialogDescription>{t("userDetailsDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-end font-semibold">{t("nameLabel")}</Label>
                <p className="col-span-2">{selectedUser?.name}</p>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-end font-semibold">{t("emailLabel")}</Label>
                <p className="col-span-2 text-sm">{selectedUser?.email}</p>
              </div>
              {selectedUser?.username != null && selectedUser.username !== "" && (
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-end font-semibold">{t("username")}:</Label>
                  <p className="col-span-2 text-sm">{selectedUser.username}</p>
                </div>
              )}
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-end font-semibold">{t("role")}:</Label>
                <div className="col-span-2">{selectedUser && getRoleBadge(selectedUser.role)}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-end font-semibold">{t("status")}:</Label>
                <div className="col-span-2">
                  <Badge variant={selectedUser?.status === "ONLINE" ? "default" : selectedUser?.status === "AWAY" ? "secondary" : "outline"}>
                    {selectedUser?.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-end font-semibold">{t("activeLabel")}</Label>
                <p className="col-span-2">{selectedUser?.isActive !== false ? t("yes") : t("no")}</p>
              </div>
              <div className="border-t pt-4">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-end font-semibold">{t("lastLogin")}:</Label>
                  <p className="col-span-2 text-sm">
                    {selectedUser?.lastLoginAt
                      ? format(new Date(selectedUser.lastLoginAt), "PPpp")
                      : t("never")}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-4 mt-2">
                  <Label className="text-end font-semibold">{t("lastLogout")}</Label>
                  <p className="col-span-2 text-sm">
                    {selectedUser?.lastLogoutAt
                      ? format(new Date(selectedUser.lastLogoutAt), "PPpp")
                      : t("never")}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-4 mt-2">
                  <Label className="text-end font-semibold">{t("sessionDuration")}</Label>
                  <p className="col-span-2 text-sm">
                    {selectedUser?.lastLoginAt ? (() => {
                      const loginTime = new Date(selectedUser.lastLoginAt)
                      const logoutTime = selectedUser.lastLogoutAt ? new Date(selectedUser.lastLogoutAt) : new Date()
                      const duration = logoutTime.getTime() - loginTime.getTime()
                      const hours = Math.floor(duration / (1000 * 60 * 60))
                      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
                      return `${hours}h ${minutes}m`
                    })() : "N/A"}
                  </p>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-end font-semibold">{t("createdLabel")}:</Label>
                  <p className="col-span-2 text-sm">
                    {selectedUser && format(new Date(selectedUser.createdAt), "PPpp")}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-4 mt-2">
                  <Label className="text-end font-semibold">{t("branchesLabel")}</Label>
                  <p className="col-span-2 text-sm">
                    {selectedUser?.branches && selectedUser.branches.length > 0
                      ? selectedUser.branches.map(b => b.name).join(", ")
                      : t("none")}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-4 mt-2">
                  <Label className="text-end font-semibold">{t("whatsAppLabel")}</Label>
                  <p className="col-span-2 text-sm">
                    {selectedUser?.whatsappAccounts && selectedUser.whatsappAccounts.length > 0
                      ? t("nAccounts").replace("{n}", String(selectedUser.whatsappAccounts.length))
                      : t("none")}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>{t("close")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout >
  )
}
