"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { Loader2, X, Type, Image } from "lucide-react"
import { getUserRole, getUser, getAuthHeader, authenticatedFetch } from "@/lib/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t, setLanguage: setI18nLanguage } = useI18n()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // General settings
  const [companyName, setCompanyName] = useState("")
  const [companyLogo, setCompanyLogo] = useState("")
  const [companyDisplayType, setCompanyDisplayType] = useState<"text" | "logo">("text")
  const [timezone, setTimezone] = useState("UTC+03:00 (Riyadh)")
  const [language, setLanguage] = useState("English")

  // Notification settings
  const [newMessagesNotif, setNewMessagesNotif] = useState(true)
  const [assignmentNotif, setAssignmentNotif] = useState(true)
  const [templateNotif, setTemplateNotif] = useState(false)
  const [dailySummaryNotif, setDailySummaryNotif] = useState(true)

  // Profile settings
  const [profileName, setProfileName] = useState("")

  // Security settings
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  useEffect(() => {
    const currentUser = getUser()
    if (currentUser) {
      setProfileName(currentUser.name || '')
    }
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await authenticatedFetch('/api/settings')
      const data = await response.json()
      if (data.success && data.settings) {
        const s = data.settings
        setCompanyName(s.companyName || "")
        setCompanyLogo(s.companyLogo || "")
        setCompanyDisplayType(s.companyDisplayType || "text")
        setTimezone(s.timezone || "UTC+03:00")
        const lang = (s.language === "ar" || s.language === "en" ? s.language : "en") as "en" | "ar"
        setLanguage(lang)
        setI18nLanguage(lang)
        setNewMessagesNotif(s.newMessagesNotif)
        setAssignmentNotif(s.assignmentNotif)
        setTemplateNotif(s.templateNotif)
        setDailySummaryNotif(s.dailySummaryNotif)
        setTwoFactorEnabled(s.twoFactorEnabled)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveGeneral = async () => {
    try {
      setIsSaving(true)
      const response = await authenticatedFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyLogo,
          companyDisplayType,
          timezone,
          language
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: t("success"), description: t("generalSettingsSaved") })
        // Reload page to update sidebar
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        toast({ title: t("error"), description: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: t("error"), description: t("failedToSaveSettings"), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t("error"),
        description: t("pleaseUploadImage"),
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSaving(true)
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          ...getAuthHeader()
        },
        body: formData
      })

      const uploadData = await uploadRes.json()
      if (uploadData.success) {
        setCompanyLogo(uploadData.url)
        setCompanyDisplayType("logo")

        // Save logo to settings immediately
        const saveRes = await authenticatedFetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyLogo: uploadData.url,
            companyDisplayType: "logo"
          })
        })

        const saveData = await saveRes.json()
        if (saveData.success) {
          toast({
            title: "Success",
            description: "Logo uploaded and saved successfully"
          })
          // Reload page to update sidebar
          setTimeout(() => {
            window.location.reload()
          }, 500)
        } else {
          toast({
            title: "Warning",
            description: saveData.error || "Logo uploaded but failed to save. Please try again.",
            variant: "destructive"
          })
        }
      } else {
        toast({
          title: "Error",
          description: uploadData.error || "Failed to upload logo",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
      e.target.value = ''
    }
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    // Apply language change immediately
    setI18nLanguage(newLanguage as 'en' | 'ar')
    toast({
      title: t("languageChanged"),
      description: `${t("languageSwitchedTo")} ${newLanguage === 'en' ? t("english") : t("arabic")}`
    })
  }

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true)
      const currentUser = getUser()

      if (!currentUser) {
        toast({ title: "Error", description: "User not found", variant: "destructive" })
        return
      }

      // Update user name in database
      const response = await authenticatedFetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          email: currentUser.email,
          role: currentUser.role
        })
      })

      const data = await response.json()
      if (data.success) {
        // Update localStorage
        const updatedUser = { ...currentUser, name: profileName }
        localStorage.setItem('user', JSON.stringify(updatedUser))

        toast({ title: "Success", description: "Profile updated successfully" })

        // Reload page to update all UI components including top bar
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    try {
      setIsSaving(true)
      const response = await authenticatedFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newMessagesNotif,
          assignmentNotif,
          templateNotif,
          dailySummaryNotif
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Notification preferences saved" })
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleNotificationToggle = async (type: 'newMessages' | 'assignment' | 'template' | 'dailySummary', value: boolean) => {
    try {
      const updateData: any = {}

      switch (type) {
        case 'newMessages':
          setNewMessagesNotif(value)
          updateData.newMessagesNotif = value
          break
        case 'assignment':
          setAssignmentNotif(value)
          updateData.assignmentNotif = value
          break
        case 'template':
          setTemplateNotif(value)
          updateData.templateNotif = value
          break
        case 'dailySummary':
          setDailySummaryNotif(value)
          updateData.dailySummaryNotif = value
          break
      }

      const response = await authenticatedFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Updated",
          description: `Notification preference ${value ? 'enabled' : 'disabled'}`,
          duration: 2000
        })
      } else {
        // Revert on error
        switch (type) {
          case 'newMessages':
            setNewMessagesNotif(!value)
            break
          case 'assignment':
            setAssignmentNotif(!value)
            break
          case 'template':
            setTemplateNotif(!value)
            break
          case 'dailySummary':
            setDailySummaryNotif(!value)
            break
        }
        toast({
          title: "Error",
          description: data.error || "Failed to update preference",
          variant: "destructive"
        })
      }
    } catch (error) {
      // Revert on error
      switch (type) {
        case 'newMessages':
          setNewMessagesNotif(!value)
          break
        case 'assignment':
          setAssignmentNotif(!value)
          break
        case 'template':
          setTemplateNotif(!value)
          break
        case 'dailySummary':
          setDailySummaryNotif(!value)
          break
      }
      toast({
        title: "Error",
        description: "Failed to update preference",
        variant: "destructive"
      })
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" })
      return
    }

    try {
      setIsSaving(true)
      const currentUser = getUser()

      if (!currentUser) {
        toast({ title: "Error", description: "User not found", variant: "destructive" })
        return
      }

      const response = await authenticatedFetch('/api/security/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          currentPassword,
          newPassword
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Password changed successfully" })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to change password", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle2FA = async (enabled: boolean) => {
    try {
      const response = await authenticatedFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twoFactorEnabled: enabled })
      })

      const data = await response.json()
      if (data.success) {
        setTwoFactorEnabled(enabled)
        toast({
          title: "Success",
          description: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`
        })
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update 2FA", variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <AppLayout title="Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  const userRole = getUserRole()
  const isAgent = userRole === 'AGENT'

  return (
    <AppLayout title={isAgent ? t("profileSettings") : t("settings")}>
      <div className="mx-auto max-w-4xl space-y-6">
        <Tabs defaultValue={isAgent ? "security" : "general"} className="space-y-6">
          {!isAgent && (
            <TabsList className="flex w-full overflow-x-auto justify-start md:grid md:grid-cols-4 bg-muted/50 p-1 h-auto gap-2 scrollbar-hide snap-x">
              <TabsTrigger value="general" className="rounded-full px-4 py-2.5 shrink-0 snap-start data-[state=active]:bg-background data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/50">{t("general")}</TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-full px-4 py-2.5 shrink-0 snap-start data-[state=active]:bg-background data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/50">{t("notifications")}</TabsTrigger>
              <TabsTrigger value="security" className="rounded-full px-4 py-2.5 shrink-0 snap-start data-[state=active]:bg-background data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/50">{t("security")}</TabsTrigger>
              <TabsTrigger value="integrations" className="rounded-full px-4 py-2.5 shrink-0 snap-start data-[state=active]:bg-background data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/50">{t("integrations")}</TabsTrigger>
            </TabsList>
          )}

          {/* General Tab - Only for ADMIN/SUPERVISOR */}
          {!isAgent && (
            <TabsContent value="general" className="space-y-4">
              <Card className="rounded-2xl shadow-soft">
                <CardHeader>
                  <CardTitle>{t("generalSettings")}</CardTitle>
                  <CardDescription>{t("manageAppPreferences")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>{t("companyDisplayType")}</Label>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <label className={`relative flex flex-col items-center justify-between rounded-xl border-2 p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-all ${companyDisplayType === "text" ? "border-primary bg-primary/5" : "border-muted bg-card"}`}>
                        <input
                          type="radio"
                          name="displayType"
                          value="text"
                          checked={companyDisplayType === "text"}
                          onChange={(e) => setCompanyDisplayType("text")}
                          className="peer sr-only"
                        />
                        <Type className="h-8 w-8 mb-2 text-muted-foreground peer-checked:text-primary" />
                        <span className="text-sm font-medium text-center">{t("textCompanyName")}</span>
                      </label>

                      <label className={`relative flex flex-col items-center justify-between rounded-xl border-2 p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-all ${companyDisplayType === "logo" ? "border-primary bg-primary/5" : "border-muted bg-card"}`}>
                        <input
                          type="radio"
                          name="displayType"
                          value="logo"
                          checked={companyDisplayType === "logo"}
                          onChange={(e) => setCompanyDisplayType("logo")}
                          className="peer sr-only"
                        />
                        <Image className="h-8 w-8 mb-2 text-muted-foreground peer-checked:text-primary" />
                        <span className="text-sm font-medium text-center">{t("logoImage")}</span>
                      </label>
                    </div>
                  </div>

                  {companyDisplayType === "text" ? (
                    <div className="space-y-2">
                      <Label htmlFor="company-name">{t("companyName")}</Label>
                      <Input
                        id="company-name"
                        placeholder={t("yourCompanyName")}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("nameAppearsInSidebar")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="company-logo">{t("companyLogo")}</Label>
                      <div className="space-y-3">
                        {companyLogo && (
                          <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-muted">
                            <img
                              src={companyLogo}
                              alt={t("companyLogo")}
                              className="w-full h-full object-contain"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6"
                              onClick={() => {
                                setCompanyLogo("")
                                setCompanyDisplayType("text")
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <div className="settings-file-row flex items-center gap-2 flex-wrap text-start">
                          <input
                            ref={fileInputRef}
                            id="company-logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="sr-only"
                            disabled={isSaving}
                            aria-label={t("companyLogo")}
                          />
                          <span className="text-sm text-muted-foreground">
                            {t("noFileChosen")}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSaving}
                          >
                            {t("chooseFile")}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-start">
                          {t("uploadLogoHint")}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="timezone">{t("timezone")}</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="w-full text-start">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC+00:00">UTC+00:00 (London)</SelectItem>
                        <SelectItem value="UTC+01:00">UTC+01:00 (Paris)</SelectItem>
                        <SelectItem value="UTC+02:00">UTC+02:00 (Cairo)</SelectItem>
                        <SelectItem value="UTC+03:00">UTC+03:00 (Riyadh)</SelectItem>
                        <SelectItem value="UTC+04:00">UTC+04:00 (Dubai)</SelectItem>
                        <SelectItem value="UTC+05:00">UTC+05:00 (Karachi)</SelectItem>
                        <SelectItem value="UTC+08:00">UTC+08:00 (Singapore)</SelectItem>
                        <SelectItem value="UTC-05:00">UTC-05:00 (New York)</SelectItem>
                        <SelectItem value="UTC-08:00">UTC-08:00 (Los Angeles)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">{t("defaultLanguage")}</Label>
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-full text-start">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">{t("english")}</SelectItem>
                        <SelectItem value="ar">{t("arabic")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:static md:p-0 md:bg-transparent md:border-none z-10">
                    <Button
                      className="w-full md:w-auto md:rounded-full rounded-xl h-12 md:h-10 text-base shadow-lg md:shadow-none"
                      onClick={handleSaveGeneral}
                      disabled={isSaving}
                    >
                      {isSaving && <Loader2 className="me-2 h-5 w-5 animate-spin shrink-0" />}
                      {t("saveChanges")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Notifications Tab - Only for ADMIN/SUPERVISOR */}
          {!isAgent && (
            <TabsContent value="notifications" className="space-y-4">
              <Card className="rounded-2xl shadow-soft">
                <CardHeader>
                  <CardTitle>{t("notificationPreferences")}</CardTitle>
                  <CardDescription>{t("chooseNotifications")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium">{t("newMessagesLabel")}</p>
                      <p className="text-sm text-muted-foreground">{t("getNotifiedNewMessages")}</p>
                    </div>
                    <Switch
                      checked={newMessagesNotif}
                      onCheckedChange={(checked) => handleNotificationToggle('newMessages', checked)}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium">{t("assignmentAlerts")}</p>
                      <p className="text-sm text-muted-foreground">{t("notifyWhenAssigned")}</p>
                    </div>
                    <Switch
                      checked={assignmentNotif}
                      onCheckedChange={(checked) => handleNotificationToggle('assignment', checked)}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium">{t("templateUpdatesLabel")}</p>
                      <p className="text-sm text-muted-foreground">{t("templateApprovalStatus")}</p>
                    </div>
                    <Switch
                      checked={templateNotif}
                      onCheckedChange={(checked) => handleNotificationToggle('template', checked)}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium">{t("dailySummaryLabel")}</p>
                      <p className="text-sm text-muted-foreground">{t("dailySummaryEmails")}</p>
                    </div>
                    <Switch
                      checked={dailySummaryNotif}
                      onCheckedChange={(checked) => handleNotificationToggle('dailySummary', checked)}
                      disabled={isSaving}
                    />
                  </div>
                  {/* Spacer for bottom bar if needed */}
                  <div className="h-12 md:hidden"></div>
                  <div className="settings-note pt-2 text-xs text-muted-foreground text-center">
                    {t("changesSavedAutomatically")}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Security Tab - Available for ALL users */}
          <TabsContent value="security" className="space-y-4">
            <Card className="rounded-2xl shadow-soft">
              <CardHeader>
                <CardTitle>{isAgent ? t("profileSettings") : t("securitySettingsTitle")}</CardTitle>
                <CardDescription>
                  {isAgent ? t("updatePasswordProfile") : t("manageAccountSecurity")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Section - Only for AGENT */}
                {isAgent && (
                  <>
                    <div className="space-y-4 pb-6 border-b rounded-lg border-border/50 p-4">
                      <h3 className="text-sm font-medium">{t("profileInformation")}</h3>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                            {getUser()?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="profile-name">{t("fullName")}</Label>
                          <Input
                            id="profile-name"
                            placeholder={t("yourNamePlaceholder")}
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:static md:p-0 md:bg-transparent md:border-none z-10">
                        <Button
                          className="w-full md:w-auto md:rounded-full rounded-xl h-12 md:h-10 text-base shadow-lg md:shadow-none"
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                        >
                          {isSaving && <Loader2 className="me-2 h-5 w-5 animate-spin shrink-0" />}
                          {t("saveProfile")}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Password Change Section */}
                <div className="space-y-4 rounded-lg border border-border/50 p-4">
                  <h3 className="text-sm font-medium">{t("changePassword")}</h3>
                  <div className="space-y-2">
                    <Label htmlFor="current-password">{t("currentPassword")}</Label>
                    <Input
                      id="current-password"
                      type="password"
                      placeholder={t("enterCurrentPassword")}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t("newPassword")}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder={t("enterNewPasswordHint")}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder={t("confirmNewPassword")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleChangePassword()
                        }
                      }}
                    />
                  </div>
                  <Button
                    className="rounded-full w-full"
                    onClick={handleChangePassword}
                    disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin shrink-0" />}
                    {t("updatePassword")}
                  </Button>
                </div>

                {/* 2FA - Only for ADMIN/SUPERVISOR */}
                {!isAgent && (
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium">{t("twoFactorAuth")}</p>
                      <p className="text-sm text-muted-foreground">{t("twoFactorAuthDesc")}</p>
                    </div>
                    <Switch
                      checked={twoFactorEnabled}
                      onCheckedChange={handleToggle2FA}
                      disabled={isSaving}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab - Only for ADMIN/SUPERVISOR */}
          {!isAgent && (
            <TabsContent value="integrations" className="space-y-4">
              <Card className="rounded-2xl shadow-soft">
                <CardHeader>
                  <CardTitle>{t("thirdPartyIntegrations")}</CardTitle>
                  <CardDescription>{t("connectExternalServices")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
                    <div className="settings-integration-inner flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <span className="text-sm font-bold">CRM</span>
                      </div>
                      <div className="text-start min-w-0">
                        <p className="font-medium">{t("crmIntegration")}</p>
                        <p className="text-sm text-muted-foreground">{t("connectCrmSystemShort")}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-full bg-transparent shrink-0"
                      onClick={() => router.push('/integrations/crm')}
                    >
                      {t("connectButton")}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
                    <div className="settings-integration-inner flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                        <span className="text-sm font-bold">API</span>
                      </div>
                      <div className="text-start min-w-0">
                        <p className="font-medium">{t("apiAccess")}</p>
                        <p className="text-sm text-muted-foreground">{t("manageApiKeysWebhooks")}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-full bg-transparent"
                      onClick={() => router.push('/integrations/api')}
                    >
                      {t("manageButton")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  )
}
