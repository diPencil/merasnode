"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { authenticatedFetch } from "@/lib/auth"
import { Loader2, Plus, Link as LinkIcon, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { formatDistanceToNow } from "date-fns"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface CrmIntegration {
    id: string
    provider: string
    isActive: boolean
    lastSyncAt: string | null
    createdAt: string
}

export default function CrmIntegrationPage() {
    const [integrations, setIntegrations] = useState<CrmIntegration[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [provider, setProvider] = useState("salesforce")
    const [apiKey, setApiKey] = useState("")
    const [apiSecret, setApiSecret] = useState("")
    const { toast } = useToast()

    useEffect(() => {
        fetchIntegrations()
    }, [])

    const fetchIntegrations = async () => {
        try {
            const response = await authenticatedFetch('/api/integrations/crm')
            const data = await response.json()
            if (data.success) {
                setIntegrations(data.integrations)
            }
        } catch (error) {
            console.error('Error fetching integrations:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateIntegration = async () => {
        if (!apiKey.trim()) {
            toast({
                title: "Error",
                description: "Please enter an API key",
                variant: "destructive"
            })
            return
        }

        try {
            setIsCreating(true)

            const response = await authenticatedFetch('/api/integrations/crm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    apiKey,
                    apiSecret: apiSecret || null
                })
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Success",
                    description: "CRM integration created successfully"
                })
                setProvider("salesforce")
                setApiKey("")
                setApiSecret("")
                setIsDialogOpen(false)
                fetchIntegrations()
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to create integration",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create integration",
                variant: "destructive"
            })
        } finally {
            setIsCreating(false)
        }
    }

    const handleToggleActive = async (id: string, isActive: boolean) => {
        try {
            const response = await authenticatedFetch('/api/integrations/crm', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive })
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Success",
                    description: `Integration ${isActive ? 'activated' : 'deactivated'}`
                })
                fetchIntegrations()
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to update integration",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update integration",
                variant: "destructive"
            })
        }
    }

    const handleDeleteIntegration = async (id: string) => {
        if (!confirm('Are you sure you want to delete this integration?')) return

        try {
            const response = await authenticatedFetch(`/api/integrations/crm?id=${id}`, {
                method: 'DELETE'
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Success",
                    description: "Integration deleted successfully"
                })
                fetchIntegrations()
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to delete integration",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete integration",
                variant: "destructive"
            })
        }
    }

    if (isLoading) {
        return (
            <AppLayout title={t("crmIntegration")}>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout title={t("crmIntegration")}>
            <div className="max-w-4xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">CRM Integrations</h2>
                        <p className="text-muted-foreground">{t("connectCrmDesc")}</p>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="me-2 h-4 w-4" />
                                Connect CRM
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t("connectCrmSystem")}</DialogTitle>
                                <DialogDescription>
                                    {t("connectCrmDesc")}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="provider">{t("crmProvider")}</Label>
                                    <Select value={provider} onValueChange={setProvider}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="salesforce">Salesforce</SelectItem>
                                            <SelectItem value="hubspot">HubSpot</SelectItem>
                                            <SelectItem value="zoho">Zoho CRM</SelectItem>
                                            <SelectItem value="pipedrive">Pipedrive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="apiKey">{t("apiKeyLabel")}</Label>
                                    <Input
                                        id="apiKey"
                                        type="password"
                                        placeholder={t("placeholderApiKey")}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="apiSecret">{t("apiSecretOptional")}</Label>
                                    <Input
                                        id="apiSecret"
                                        type="password"
                                        placeholder={t("placeholderApiSecret")}
                                        value={apiSecret}
                                        onChange={(e) => setApiSecret(e.target.value)}
                                    />
                                </div>
                                <Button
                                    onClick={handleCreateIntegration}
                                    disabled={isCreating}
                                    className="w-full"
                                >
                                    {isCreating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                    Connect
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {integrations.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium mb-2">{t("noCrmIntegrationsYet")}</p>
                            <p className="text-sm text-muted-foreground mb-4">
                                Connect your CRM to start syncing data
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {integrations.map((integration) => (
                            <Card key={integration.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                <LinkIcon className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg capitalize">{integration.provider}</CardTitle>
                                                <CardDescription>
                                                    Connected {formatDistanceToNow(new Date(integration.createdAt), { addSuffix: true })}
                                                    {integration.lastSyncAt && (
                                                        <> • Last sync {formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true })}</>
                                                    )}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={integration.isActive}
                                                onCheckedChange={(checked) => handleToggleActive(integration.id, checked)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteIntegration(integration.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    )
}
