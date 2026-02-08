"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { QrCode, CheckCircle2, Loader2, RefreshCw } from "lucide-react"

export default function WhatsAppPage() {
    const { toast } = useToast()
    const { t } = useI18n()
    const [isReady, setIsReady] = useState(false)
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isInitializing, setIsInitializing] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [accountInfo, setAccountInfo] = useState<{ name: string; phone: string; accountId?: string } | null>(null)
    const [waitingForQr, setWaitingForQr] = useState(false)

    useEffect(() => {
        checkStatus()
        fetchAccountInfo()
    }, [])

    useEffect(() => {
        const interval = setInterval(checkStatus, waitingForQr ? 2000 : 5000)
        return () => clearInterval(interval)
    }, [waitingForQr])

    const fetchAccountInfo = async () => {
        try {
            const response = await fetch('/api/whatsapp/accounts')
            const data = await response.json()
            if (data.success && data.accounts && data.accounts.length > 0) {
                // Get the first account (assuming single account for now) or the connected one
                const account = data.accounts[0]
                if (account) {
                    setAccountInfo({
                        name: account.name,
                        phone: account.phone,
                        accountId: account.id
                    })
                }
            }
        } catch (error) {
            console.error('Error fetching account info:', error)
        }
    }

    const checkStatus = async () => {
        try {
            const response = await fetch('/api/whatsapp')
            const data = await response.json()

            if (data.success) {
                setIsReady(data.isReady)
                setQrCode(data.qrCode)
                if (data.qrCode || data.isReady) setWaitingForQr(false)

                // If live session has info, use it. Otherwise, keep existing or fetch from DB.
                if (data.userInfo) {
                    // Get account ID from accounts list
                    if (data.accounts && data.accounts.length > 0) {
                        const connectedAccount = data.accounts[0]
                        setAccountInfo({
                            ...data.userInfo,
                            accountId: connectedAccount.accountId
                        })
                    } else {
                        setAccountInfo(data.userInfo)
                    }
                } else {
                    // Fallback to DB fetch if we don't have live info but might have a saved account
                    fetchAccountInfo()
                }
            }
        } catch (err) {
            console.error('Error checking WhatsApp status:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleInitialize = async () => {
        try {
            setIsInitializing(true)
            const response = await fetch('/api/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'init' })
            })

            const data = await response.json()

            if (data.success) {
                setWaitingForQr(true)
                toast({
                    title: "Success",
                    description: "جاري تجهيز رمز QR... انتظر حتى ٣٠ ثانية ولا تغلق الصفحة."
                })
                setTimeout(checkStatus, 3000)
                setTimeout(() => setWaitingForQr(false), 90000)
            } else {
                toast({
                    title: "Error",
                    description: data.error || 'فشل تهيئة الواتساب',
                    variant: "destructive"
                })
            }
        } catch (err) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to initialize WhatsApp",
                variant: "destructive"
            })
        } finally {
            setIsInitializing(false)
        }
    }

    const handleSync = async () => {
        if (!accountInfo?.accountId) {
            toast({
                title: "Error",
                description: "No account connected",
                variant: "destructive"
            })
            return
        }

        try {
            setIsSyncing(true)
            const response = await fetch('/api/whatsapp/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ accountId: accountInfo.accountId })
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Success",
                    description: `Synced ${data.synced.contacts} contacts and ${data.synced.conversations} conversations`
                })
            } else {
                toast({
                    title: "Error",
                    description: data.error,
                    variant: "destructive"
                })
            }
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to sync WhatsApp data",
                variant: "destructive"
            })
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <AppLayout title={t("whatsappIntegration")}>
            <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                    Connect your WhatsApp account to send and receive messages
                </p>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Status Card */}
                    <Card className="rounded-2xl shadow-soft">
                        <CardHeader>
                            <CardTitle>{t("connectionStatus")}</CardTitle>
                            <CardDescription>WhatsApp account connection status</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Status:</span>
                                {isLoading ? (
                                    <Badge variant="outline">
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Checking...
                                    </Badge>
                                ) : isReady ? (
                                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                                        <CheckCircle2 className="mr-2 h-3 w-3" />
                                        Connected
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">
                                        Disconnected
                                    </Badge>
                                )}
                            </div>

                            {/* Account Info */}
                            {accountInfo && (
                                <div className="space-y-3 rounded-lg bg-green-50/50 p-4 border border-green-100 dark:bg-green-900/10 dark:border-green-900/30">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center dark:bg-green-900/30 dark:text-green-400">
                                            <QrCode className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold">{accountInfo.name}</p>
                                                {!isReady && (
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 text-yellow-600 border-yellow-200 bg-yellow-50">
                                                        Offline
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{accountInfo.phone?.startsWith('+') ? accountInfo.phone : `+${accountInfo.phone || ''}`}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isReady && !qrCode && (
                                <Button
                                    onClick={handleInitialize}
                                    disabled={isInitializing}
                                    className="w-full"
                                >
                                    {isInitializing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Initializing...
                                        </>
                                    ) : (
                                        <>
                                            <QrCode className="mr-2 h-4 w-4" />
                                            Connect WhatsApp
                                        </>
                                    )}
                                </Button>
                            )}

                            {!isReady && (
                                <Button
                                    variant="outline"
                                    onClick={checkStatus}
                                    className="w-full"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Refresh Status
                                </Button>
                            )}

                            {isReady && accountInfo && (
                                <Button
                                    variant="default"
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                    className="w-full"
                                >
                                    {isSyncing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Syncing...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            Sync Chats & Contacts
                                        </>
                                    )}
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* QR Code Card */}
                    <Card className="rounded-2xl shadow-soft">
                        <CardHeader>
                            <CardTitle>QR Code</CardTitle>
                            <CardDescription>{t("scanWithWhatsApp")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {qrCode ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center rounded-lg bg-white p-4">
                                        {qrCode.startsWith('data:image') ? (
                                            <img
                                                src={qrCode}
                                                alt="WhatsApp QR Code"
                                                className="h-64 w-64 object-contain"
                                            />
                                        ) : (
                                            <div className="text-red-500">
                                                Invalid QR code format
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>1. Open WhatsApp on your phone</p>
                                        <p>2. Tap Menu or Settings → Linked Devices</p>
                                        <p>3. Tap "Link a Device"</p>
                                        <p>4. Scan this QR code</p>
                                    </div>
                                </div>
                            ) : isReady ? (
                                <div className="flex h-64 items-center justify-center text-center">
                                    <div>
                                        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                                        <p className="mt-4 font-medium">WhatsApp Connected!</p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            You can now send and receive messages
                                        </p>
                                    </div>
                                </div>
                            ) : waitingForQr ? (
                                <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                    <div>
                                        <p className="font-medium">جاري تجهيز رمز QR</p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            عادةً ١٠–٣٠ ثانية. لا تغلق الصفحة.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-64 items-center justify-center text-center">
                                    <div>
                                        <QrCode className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <p className="mt-4 text-sm text-muted-foreground">
                                            Click "Connect WhatsApp" to generate QR code
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    )
}
