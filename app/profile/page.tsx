"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { Loader2, Upload } from "lucide-react"
import Image from "next/image"
import { authenticatedFetch } from "@/lib/auth"

export default function ProfilePage() {
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        avatar: '/favicon.png'
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const { toast } = useToast()
    const { t } = useI18n()

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const response = await authenticatedFetch('/api/profile')
            const data = await response.json()

            if (data.success) {
                setProfile(data.profile)
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setIsSaving(true)
            const response = await authenticatedFetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: profile.name,
                    avatar: profile.avatar
                })
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Success",
                    description: "Profile updated successfully"
                })
                // Reload page to update header
                window.location.reload()
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to update profile",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update profile",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <AppLayout title={t("profile")}>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout title={t("profile")}>
            <div className="max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("profileSettings")}</CardTitle>
                        <CardDescription>{t("manageAccountInfo")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Avatar Section */}
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="h-24 w-24 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                                    <Image
                                        src={profile.avatar}
                                        alt="Profile"
                                        width={96}
                                        height={96}
                                        className="object-contain"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <Label>{t("profilePicture")}</Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Currently using: {profile.avatar}
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={t("imageUrlPlaceholder")}
                                        value={profile.avatar}
                                        onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                                    />
                                    <Button variant="outline" size="icon">
                                        <Upload className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                placeholder="Enter your name"
                            />
                        </div>

                        {/* Email (Read-only) */}
                        <div className="space-y-2">
                            <Label htmlFor="email">{t("email")}</Label>
                            <Input
                                id="email"
                                value={profile.email}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                                Email cannot be changed
                            </p>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={fetchProfile}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    )
}
