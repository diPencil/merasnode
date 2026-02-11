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
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null)
  const canDeleteAccount = getUserRole() === "ADMIN"
  const [qrAccountId, setQrAccountId] = useState<string | null>(null)
  const [linkingAccountId, setLinkingAccountId] = useState<string | null>(null)
  const [linkingQrCode, setLinkingQrCode] = useState<string | null>(null)
  const [linkingStatus, setLinkingStatus] = useState<string>("INITIALIZING")
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
          title: "Error",
          description: data.error || "Failed to fetch accounts",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch WhatsApp accounts",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    if (!newAccount.name || !newAccount.phone) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
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
        try {
          await authenticatedFetch('/api/whatsapp/reload', { method: 'POST' })
        } catch {
          // reload optional; service may still init account on first Link
        }
        toast({
          title: "Success",
          description: "WhatsApp account created successfully"
        })
        setIsCreateOpen(false)
        setNewAccount({ name: "", phone: "" })
        setQrGenerated(false)
        fetchAccounts()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create account",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create WhatsApp account",
        variant: "destructive"
      })
    }
  }

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText("https://your-domain.com/api/webhook")
    toast({
      title: "Copied to clipboard",
      description: "Webhook URL has been copied",
    })
  }

  const [status, setStatus] = useState<"DISCONNECTED" | "INITIALIZING" | "WAITING_FOR_SCAN" | "CONNECTED">("DISCONNECTED")
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout
    const idToPoll = qrAccountId

    if ((qrGenerated || status === 'INITIALIZING' || status === 'WAITING_FOR_SCAN') && idToPoll) {
      interval = setInterval(async () => {
        try {
          const res = await authenticatedFetch(`/api/whatsapp/auth?accountId=${encodeURIComponent(idToPoll)}`)
          const data = await res.json()

          if (data.status) {
            setStatus(data.status)
            if (data.status === 'CONNECTED') {
              setQrGenerated(false)
              setQrAccountId(null)
              setIsCreateOpen(false)
              toast({ title: "Connected", description: "WhatsApp Web Connected Successfully" })
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
  }, [qrGenerated, status, qrAccountId])

  useEffect(() => {
    let interval: NodeJS.Timeout
    const idToPoll = linkingAccountId
    if (!idToPoll) return
    interval = setInterval(async () => {
      try {
        const res = await authenticatedFetch(`/api/whatsapp/auth?accountId=${encodeURIComponent(idToPoll)}`)
        const data = await res.json()
        if (data.status) setLinkingStatus(data.status)
        if (data.qrCode) setLinkingQrCode(data.qrCode)
        if (data.status === 'CONNECTED') {
          setLinkingAccountId(null)
          setLinkingQrCode(null)
          toast({ title: "Connected", description: "WhatsApp account linked successfully" })
          fetchAccounts()
        }
      } catch {
        // ignore
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [linkingAccountId])

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
          title: "Success",
          description: "Account deleted successfully",
        })
        fetchAccounts()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete account",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      })
    } finally {
      setAccountToDelete(null)
    }
  }



  const handleGenerateQR = async () => {
    if (!newAccount.name?.trim() || !newAccount.phone?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter account name and phone first",
        variant: "destructive"
      })
      return
    }
    setStatus('INITIALIZING')
    try {
      let accountId = qrAccountId
      if (!accountId) {
        const createRes = await authenticatedFetch('/api/whatsapp/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newAccount.name.trim(),
            phone: newAccount.phone.trim(),
            provider: provider === "meta-cloud" ? "meta-cloud-api" : "whatsapp-web.js"
          })
        })
        const createData = await createRes.json()
        if (!createData.success) {
          toast({ title: "Error", description: createData.error || "Failed to create account", variant: "destructive" })
          return
        }
        accountId = createData.account.id
        setQrAccountId(accountId)
        fetchAccounts()
      }
      const response = await authenticatedFetch('/api/whatsapp/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init', accountId, force: true })
      })
      const data = await response.json()
      if (!data.success) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        setQrGenerated(false)
        setQrAccountId(null)
        return
      }
      setQrGenerated(true)
    } catch (error) {
      toast({ title: "Error", description: "Failed to start WhatsApp Client", variant: "destructive" })
      setQrGenerated(false)
      setQrAccountId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'connected':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        )
      case 'waiting':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Waiting
          </Badge>
        )
      case 'disconnected':
      default:
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Disconnected
          </Badge>
        )
    }
  }

  // Calculate stats
  const totalAccounts = accounts.length
  const connectedAccounts = accounts.filter(a => a.status === 'CONNECTED').length
  const disconnectedAccounts = accounts.filter(a => a.status === 'DISCONNECTED').length

  return (
    <AppLayout title={t("whatsappAccounts")}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("whatsappAccounts")}</h2>
            <p className="text-muted-foreground">{t("manageWhatsAppAccounts")}</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full shadow-md">
                <Plus className="mr-2 h-4 w-4" />
                {t("connectAccountButton")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{t("connectWhatsAppAccount")}</DialogTitle>
                <DialogDescription>{t("chooseConnectionMethod")}</DialogDescription>
              </DialogHeader>

              <Tabs value={provider} onValueChange={(v) => setProvider(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="meta-cloud">{t("metaCloudApi")}</TabsTrigger>
                  <TabsTrigger value="whatsapp-web">{t("whatsAppWeb")}</TabsTrigger>
                </TabsList>

                <TabsContent value="meta-cloud" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-name">{t("accountName")}</Label>
                    <Input id="account-name" placeholder={t("placeholderAccountName")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("phoneNumber")}</Label>
                    <Input id="phone" placeholder={t("placeholderPhone")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone-number-id">{t("phoneNumberId")}</Label>
                    <Input id="phone-number-id" placeholder={t("placeholderPhoneNumberId")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-account-id">{t("businessAccountId")}</Label>
                    <Input id="business-account-id" placeholder={t("placeholderBusinessId")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="access-token">{t("accessToken")}</Label>
                    <Input id="access-token" type="password" placeholder={t("placeholderAccessToken")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verify-token">{t("webhookVerifyToken")}</Label>
                    <Input id="verify-token" placeholder={t("placeholderVerifyToken")} />
                  </div>
                </TabsContent>

                <TabsContent value="whatsapp-web" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="web-account-name">{t("accountName")}</Label>
                    <Input
                      id="web-account-name"
                      placeholder={t("supportLineExample")}
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="web-phone">{t("phoneNumber")}</Label>
                    <Input
                      id="web-phone"
                      placeholder={t("placeholderPhone")}
                      value={newAccount.phone}
                      onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
                    />
                  </div>

                  {!qrGenerated ? (
                    <Button onClick={handleGenerateQR} className="w-full" size="lg">
                      <QrCode className="mr-2 h-5 w-5" />
                      {t("generateQrCode")}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center rounded-xl bg-muted/50 p-8">
                        <div className="h-64 w-64 rounded-lg bg-white shadow-soft-lg flex items-center justify-center overflow-hidden">
                          {status === 'INITIALIZING' ? (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <RefreshCw className="h-8 w-8 animate-spin" />
                              <span>{t("initializingClient")}</span>
                            </div>
                          ) : qrCodeData ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={qrCodeData} alt="WhatsApp QR Code" className="h-full w-full object-contain" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <RefreshCw className="h-8 w-8 animate-spin" />
                              <span>{t("waitingForQr")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-secondary/10 p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-secondary" />
                          <span>{t("waitingForScan")}</span>
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
                  {t("cancel")}
                </Button>
                <Button onClick={handleCreateAccount}>{t("connectAccountButton")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("totalAccounts")}</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAccounts}</div>
              <p className="text-xs text-muted-foreground">
                {t("allWhatsAppAccounts")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("connected")}</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {connectedAccounts}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("activeConnections")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("disconnected")}</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {disconnectedAccounts}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("inactiveConnections")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("accountsList")}</CardTitle>
            <CardDescription>{t("viewManageAccounts")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="text-muted-foreground">{t("loadingAccounts")}</div>
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2">
                <Smartphone className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t("noWhatsAppAccountsConnected")}</p>
                <Button onClick={() => setIsCreateOpen(true)} variant="outline" size="sm">
                  {t("connectFirstAccount")}
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">{t("accountName")}</TableHead>
                      <TableHead>{t("phoneNumber")}</TableHead>
                      <TableHead>{t("provider")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("connectedDate")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
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
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {account.status !== 'CONNECTED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  setLinkingAccountId(account.id)
                                  setLinkingQrCode(null)
                                  setLinkingStatus('INITIALIZING')
                                  try {
                                    const res = await authenticatedFetch('/api/whatsapp/auth', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ action: 'init', accountId: account.id, force: true })
                                    })
                                    const data = await res.json()
                                    if (!data.success) {
                                      toast({ title: "Error", description: data.error, variant: "destructive" })
                                      setLinkingAccountId(null)
                                    }
                                  } catch {
                                    toast({ title: "Error", description: "Failed to start linking", variant: "destructive" })
                                    setLinkingAccountId(null)
                                  }
                                }}
                              >
                                <QrCode className="mr-1 h-3 w-3" />
                                Link
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.location.href = '/whatsapp'}
                            >
                              Manage
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toast({
                                title: "Test Message",
                                description: `Testing connection to ${account.name}`,
                              })}
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
            )}
          </CardContent>
        </Card>

        <Dialog open={!!linkingAccountId} onOpenChange={(open) => !open && setLinkingAccountId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Link WhatsApp account</DialogTitle>
              <DialogDescription>Scan the QR code with WhatsApp on your phone.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              {linkingStatus === 'INITIALIZING' && !linkingQrCode ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span>Preparing QR code...</span>
                </div>
              ) : linkingQrCode ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={linkingQrCode} alt="WhatsApp QR Code" className="h-64 w-64 rounded-lg object-contain bg-white p-2" />
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setLinkingAccountId(null)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
