"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Smartphone, CheckCircle2, XCircle, Clock, Copy, QrCode, RefreshCw, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { authenticatedFetch, getUserRole } from "@/lib/auth"

interface WhatsAppAccount {
  id: string
  name: string
  phone: string
  provider: string
  status: "CONNECTED" | "DISCONNECTED" | "WAITING"
  createdAt: string
  updatedAt: string
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [provider, setProvider] = useState<"meta-cloud" | "whatsapp-web">("whatsapp-web")
  const [qrGenerated, setQrGenerated] = useState(false)
  const [newAccount, setNewAccount] = useState({
    name: "",
    phone: ""
  })
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null)
  const canDeleteAccount = getUserRole() === "ADMIN"
  const { toast } = useToast()
  const { t, language } = useI18n()

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setIsLoading(true)
      const response = await authenticatedFetch('/api/whatsapp/accounts')
      const data = await response.json()

      if (data.success) {
        setAccounts(data.accounts)
      } else {
        toast({
          title: t("error"),
          description: data.error || t("failedToFetchAccounts"),
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToFetchWhatsAppAccounts"),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    if (createdAccountId) {
      // Account was already created during QR generation
      setIsCreateOpen(false)
      setNewAccount({ name: "", phone: "" })
      setCreatedAccountId(null)
      setQrGenerated(false)
      fetchAccounts()
      return
    }

    if (!newAccount.name || !newAccount.phone) {
      toast({
        title: t("validationError"),
        description: t("pleaseFillAllRequiredFields"),
        variant: "destructive"
      })
      return
    }

    try {
      const response = await authenticatedFetch('/api/whatsapp/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAccount,
          provider: provider === "meta-cloud" ? "meta-cloud-api" : "whatsapp-web.js"
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: t("success"),
          description: t("whatsAppAccountCreatedSuccess")
        })
        setIsCreateOpen(false)
        setNewAccount({ name: "", phone: "" })
        setCreatedAccountId(null)
        setQrGenerated(false)
        fetchAccounts()
      } else {
        toast({
          title: t("errorTitle"),
          description: data.error || t("failedToCreateAccountDesc"),
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToCreateWhatsAppAccount"),
        variant: "destructive"
      })
    }
  }

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText("https://your-domain.com/api/webhook")
    toast({
      title: t("copiedToClipboard"),
      description: t("webhookUrlCopied"),
    })
  }

  const [status, setStatus] = useState<"DISCONNECTED" | "INITIALIZING" | "WAITING_FOR_SCAN" | "CONNECTED">("DISCONNECTED")
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (qrGenerated || status === 'INITIALIZING' || status === 'WAITING_FOR_SCAN') {
      interval = setInterval(async () => {
        try {
          const url = createdAccountId ? `/api/whatsapp/auth?accountId=${createdAccountId}` : '/api/whatsapp/auth'
          const res = await authenticatedFetch(url)
          const data = await res.json()

          if (data.status) {
            setStatus(data.status)
            if (data.status === 'CONNECTED') {
              setQrGenerated(false)
              setIsCreateOpen(false)
              toast({ title: t("connectedTitle"), description: t("whatsAppWebConnectedSuccessfully") })
              fetchAccounts() // Refresh list
            }
          }
          if (data.qrCode) {
            setQrCodeData(data.qrCode)
          }
        } catch (error) {
          console.error("Polling error", error)
        }
      }, 2000)
    }

    return () => clearInterval(interval)
  }, [qrGenerated, status])

  const handleDeleteClick = (id: string) => {
    setAccountToDelete(id)
  }

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return

    try {
      const response = await authenticatedFetch(`/api/whatsapp/accounts?id=${accountToDelete}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: t("success"),
          description: t("accountDeletedSuccess"),
        })
        fetchAccounts()
      } else {
        toast({
          title: t("error"),
          description: data.error || t("failedToDeleteAccount"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToDeleteAccount"),
        variant: "destructive",
      })
    } finally {
      setAccountToDelete(null)
    }
  }



  const handleGenerateQR = async () => {
    if (!newAccount.name || !newAccount.phone) {
      toast({
        title: t("validationError"),
        description: t("pleaseFillAllRequiredFields"),
        variant: "destructive"
      })
      return
    }

    setQrGenerated(true)
    setStatus('INITIALIZING')

    try {
      let accountId = createdAccountId

      // 1. Create account first if not already created
      if (!accountId) {
        const createRes = await authenticatedFetch('/api/whatsapp/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newAccount,
            provider: provider === "meta-cloud" ? "meta-cloud-api" : "whatsapp-web.js"
          })
        })
        const createData = await createRes.json()

        if (!createData.success) {
          toast({ title: t("errorTitle"), description: createData.error || t("failedToCreateAccountDesc"), variant: "destructive" })
          setQrGenerated(false)
          setStatus('DISCONNECTED')
          return
        }

        accountId = createData.account.id
        setCreatedAccountId(accountId)
        fetchAccounts() // Refresh list in background
      }

      // 2. Start initialization
      const response = await authenticatedFetch('/api/whatsapp/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init', accountId, force: true })
      })

      const data = await response.json()
      if (!data.success) {
        toast({ title: t("error"), description: data.error, variant: "destructive" })
        setQrGenerated(false)
        setStatus('DISCONNECTED')
      }
    } catch (error) {
      toast({ title: t("error"), description: t("failedToStartWhatsAppClient"), variant: "destructive" })
      setQrGenerated(false)
      setStatus('DISCONNECTED')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'connected':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {t("connectedTitle")}
          </Badge>
        )
      case 'waiting':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            {t("waiting")}
          </Badge>
        )
      case 'disconnected':
      default:
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            {t("disconnectedTitle")}
          </Badge>
        )
    }
  }

  // Calculate stats
  const totalAccounts = accounts.length
  const connectedAccounts = accounts.filter(a => a.status === 'CONNECTED').length
  const disconnectedAccounts = accounts.filter(a => a.status === 'DISCONNECTED').length

  return (
    <AppLayout title={t("whatsAppAccountsPageTitle")}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("whatsAppAccountsPageTitle")}</h2>
            <p className="text-muted-foreground">{t("manageWhatsAppAccounts")}</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full shadow-md gap-2">
                <Plus className="h-4 w-4" />
                {t("connectAccount")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]" fullScreenMobile>
              <DialogHeader>
                <DialogTitle>{t("connectWhatsAppAccount")}</DialogTitle>
                <DialogDescription>{t("chooseConnectionMethod")}</DialogDescription>
              </DialogHeader>

              <Tabs value={provider} onValueChange={(v) => setProvider(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="meta-cloud">Meta Cloud API</TabsTrigger>
                  <TabsTrigger value="whatsapp-web">WhatsApp Web</TabsTrigger>
                </TabsList>

                <TabsContent value="meta-cloud" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-name">Account Name</Label>
                    <Input id="account-name" placeholder="e.g., Main Sales Number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="+1234567890" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone-number-id">Phone Number ID</Label>
                    <Input id="phone-number-id" placeholder="Enter phone number ID from Meta" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-account-id">Business Account ID</Label>
                    <Input id="business-account-id" placeholder="Enter business account ID" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="access-token">Access Token</Label>
                    <Input id="access-token" type="password" placeholder="Enter your access token" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verify-token">Webhook Verify Token</Label>
                    <Input id="verify-token" placeholder="Create a verify token" />
                  </div>
                </TabsContent>

                <TabsContent value="whatsapp-web" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="web-account-name">Account Name</Label>
                    <Input
                      id="web-account-name"
                      placeholder="e.g., Support Line"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="web-phone">Phone Number</Label>
                    <Input
                      id="web-phone"
                      placeholder="+966501234567"
                      value={newAccount.phone}
                      onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
                    />
                  </div>

                  {!qrGenerated ? (
                    <Button onClick={handleGenerateQR} className="w-full gap-2" size="lg">
                      <QrCode className="h-5 w-5" />
                      Generate QR Code
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center rounded-xl bg-muted/50 p-8">
                        <div className="h-64 w-64 rounded-lg bg-white shadow-soft-lg flex items-center justify-center overflow-hidden">
                          {status === 'INITIALIZING' ? (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <RefreshCw className="h-8 w-8 animate-spin" />
                              <span>Initializing Client...</span>
                            </div>
                          ) : qrCodeData ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={qrCodeData} alt="WhatsApp QR Code" className="h-full w-full object-contain" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <RefreshCw className="h-8 w-8 animate-spin" />
                              <span>Waiting for QR...</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-secondary/10 p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-secondary" />
                          <span>Waiting for scan...</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleGenerateQR}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAccount}>Connect Account</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAccounts}</div>
              <p className="text-xs text-muted-foreground">
                All WhatsApp accounts
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {connectedAccounts}
              </div>
              <p className="text-xs text-muted-foreground">
                Active connections
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disconnected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {disconnectedAccounts}
              </div>
              <p className="text-xs text-muted-foreground">
                Inactive connections
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Accounts List</CardTitle>
            <CardDescription>View and manage all your WhatsApp accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="text-muted-foreground">Loading accounts...</div>
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2">
                <Smartphone className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No WhatsApp accounts connected</p>
                <Button onClick={() => setIsCreateOpen(true)} variant="outline" size="sm">
                  Connect your first account
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile: Card list */}
                <div className="md:hidden space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="rounded-xl border bg-card p-4 space-y-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{account.name}</p>
                          <p className="text-sm text-muted-foreground font-mono">{account.phone}</p>
                          <div className="mt-2">{getStatusBadge(account.status)}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-[44px] flex-1"
                          onClick={() => (window.location.href = "/whatsapp")}
                        >
                          Manage
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-[44px] flex-1"
                          onClick={() =>
                            toast({
                              title: "Test Message",
                              description: `Testing connection to ${account.name}`,
                            })
                          }
                        >
                          Test
                        </Button>
                        {canDeleteAccount && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => handleDeleteClick(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">{t("accountName")}</TableHead>
                        <TableHead>{t("phoneNumber")}</TableHead>
                        <TableHead>{t("providerLabel")}</TableHead>
                        <TableHead>{t("statusLabel")}</TableHead>
                        <TableHead>{t("connectedDate")}</TableHead>
                        <TableHead className="text-end">{t("actionsTableHeader")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Smartphone className="h-4 w-4" />
                              </div>
                              {account.name}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{account.phone}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-full">
                              {account.provider === "meta-cloud-api" ? "Meta Cloud API" : "WhatsApp Web"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(account.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(account.createdAt), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="text-end">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => (window.location.href = "/whatsapp")}
                              >
                                Manage
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  toast({
                                    title: "Test Message",
                                    description: `Testing connection to ${account.name}`,
                                  })
                                }
                              >
                                Test
                              </Button>
                              {canDeleteAccount && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteClick(account.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {canDeleteAccount && (
        <AlertDialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {language === 'ar' ? 'هل أنت متأكد تماماً؟' : 'Are you absolutely sure?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {language === 'ar'
                  ? 'لا يمكن التراجع عن هذا الإجراء. سوف يتم حذف ربط حساب واتساب نهائياً من الخوادم.'
                  : 'This action cannot be undone. This will permanently delete the WhatsApp account connection from our servers.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {language === 'ar' ? 'حذف' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        )}
      </div>
    </AppLayout>
  )
}
