"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Copy, Trash2, Plus, Key } from "lucide-react"
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
import { authenticatedFetch } from "@/lib/auth"

interface ApiKey {
    id: string
    name: string
    key: string
    isActive: boolean
    createdAt: string
    expiresAt: string | null
}

export default function ApiKeysPage() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newKeyName, setNewKeyName] = useState("")
    const [expiresIn, setExpiresIn] = useState("never")
    const { toast } = useToast()
    const { t } = useI18n()

    useEffect(() => {
        fetchApiKeys()
    }, [])

    const fetchApiKeys = async () => {
        try {
            const response = await authenticatedFetch('/api/integrations/api-keys')
            const data = await response.json()
            if (data.success) {
                setApiKeys(data.apiKeys)
            }
        } catch (error) {
            console.error('Error fetching API keys:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            toast({
                title: "Error",
                description: "Please enter a name for the API key",
                variant: "destructive"
            })
            return
        }

        try {
            setIsCreating(true)
            const expiresInDays = expiresIn === "never" ? null : parseInt(expiresIn)

            const response = await authenticatedFetch('/api/integrations/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newKeyName,
                    expiresInDays
                })
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Success",
                    description: "API key created successfully"
                })
                setNewKeyName("")
                setExpiresIn("never")
                setIsDialogOpen(false)
                fetchApiKeys()
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to create API key",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create API key",
                variant: "destructive"
            })
        } finally {
            setIsCreating(false)
        }
    }

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key)
        toast({
            title: "Copied",
            description: "API key copied to clipboard"
        })
    }

    const handleDeleteKey = async (id: string) => {
        if (!confirm('Are you sure you want to delete this API key?')) return

        try {
            const response = await authenticatedFetch(`/api/integrations/api-keys?id=${id}`, {
                method: 'DELETE'
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Success",
                    description: "API key deleted successfully"
                })
                fetchApiKeys()
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to delete API key",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete API key",
                variant: "destructive"
            })
        }
    }

    if (isLoading) {
        return (
            <AppLayout title={t("apiKeys")}>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout title={t("apiKeys")}>
            <div className="max-w-4xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">API Keys</h2>
                        <p className="text-muted-foreground">{t("manageApiKeys")}</p>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="me-2 h-4 w-4" />
                                Create API Key
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t("createNewApiKey")}</DialogTitle>
                                <DialogDescription>
                                    {t("manageApiKeys")}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t("keyName")}</Label>
                                    <Input
                                        id="name"
                                        placeholder={t("placeholderApiKeyName")}
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="expires">Expires In</Label>
                                    <Select value={expiresIn} onValueChange={setExpiresIn}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="never">Never</SelectItem>
                                            <SelectItem value="30">30 days</SelectItem>
                                            <SelectItem value="90">90 days</SelectItem>
                                            <SelectItem value="365">1 year</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={handleCreateKey}
                                    disabled={isCreating}
                                    className="w-full"
                                >
                                    {isCreating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                    Generate Key
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {apiKeys.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Key className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium mb-2">{t("noApiKeysYet")}</p>
                            <p className="text-sm text-muted-foreground mb-4">
                                Create your first API key to get started
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {apiKeys.map((apiKey) => (
                            <Card key={apiKey.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg">{apiKey.name}</CardTitle>
                                            <CardDescription>
                                                Created {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
                                                {apiKey.expiresAt && (
                                                    <> • Expires {formatDistanceToNow(new Date(apiKey.expiresAt), { addSuffix: true })}</>
                                                )}
                                            </CardDescription>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteKey(apiKey.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={apiKey.key}
                                            readOnly
                                            className="font-mono text-sm"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleCopyKey(apiKey.key)}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    )
}
