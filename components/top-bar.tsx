"use client"

import { logout, getUser } from "@/lib/auth"
import { Search, Calendar, Globe, Bell, X, Check, Trash2, CheckCircle2, User, Settings, KeyRound, LogOut } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "./theme-toggle"
import { LanguageSwitcher } from "./language-switcher"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface TopBarProps {
  title?: string
  showSearch?: boolean
  isMobile?: boolean
}

interface Notification {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  link?: string | null
}

export function TopBar({ title, showSearch = true, isMobile = false }: TopBarProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { t, language, dir } = useI18n()
  const [currentDate, setCurrentDate] = useState("")
  const [currentTime, setCurrentTime] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Load user data on mount and when localStorage changes
  useEffect(() => {
    const loadUser = () => {
      const user = getUser()
      setCurrentUser(user)
    }

    loadUser()

    // Listen for storage changes (when user updates profile)
    window.addEventListener('storage', loadUser)
    return () => window.removeEventListener('storage', loadUser)
  }, [])

  const fetchNotifications = async (isPolling = false) => {
    try {
      if (!currentUser?.id) return

      const response = await fetch(`/api/notifications?userId=${currentUser.id}`)
      const data = await response.json()
      if (data.success) {
        const fetchedNotifications = data.notifications || []
        setNotifications(fetchedNotifications)
        setUnreadCount(data.unreadCount || 0)

        // Toast logic for new notifications
        if (isPolling && fetchedNotifications.length > 0) {
          const latest = fetchedNotifications[0]
          if (lastNotificationId && latest.id !== lastNotificationId) {
            // New notification detected
            toast({
              title: latest.title,
              description: latest.message,
              action: latest.link ? (
                <Button size="sm" variant="outline" onClick={() => router.push(latest.link!)}>
                  {t("view")}
                </Button>
              ) : undefined,
            })
          }
          setLastNotificationId(latest.id)
        } else if (!lastNotificationId && fetchedNotifications.length > 0) {
          setLastNotificationId(fetchedNotifications[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  useEffect(() => {
    // Only fetch if we have a user
    if (currentUser?.id) {
      fetchNotifications()
    }
    // Poll for notifications every 10 seconds
    const interval = setInterval(() => {
      if (currentUser?.id) fetchNotifications(true)
    }, 10000)
    return () => clearInterval(interval)
  }, [currentUser, lastNotificationId])

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PUT' })
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const clearAllNotifications = async () => {
    try {
      await fetch('/api/notifications', { method: 'DELETE' })
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      setNotifications(prev => prev.filter(n => n.id !== id))
      setUnreadCount(prev => {
        const notif = notifications.find(n => n.id === id)
        return notif && !notif.isRead ? Math.max(0, prev - 1) : prev
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link)
      setIsNotificationsOpen(false)
    }
  }

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()
      const locale = language === "ar" ? "ar-SA" : "en-US"
      setCurrentDate(now.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" }))
      setCurrentTime(now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }))
    }

    updateDateTime()
    const interval = setInterval(updateDateTime, 1000)

    return () => clearInterval(interval)
  }, [language])

  return (
    <header
      className={cn(
        "flex h-14 sm:h-16 items-center justify-between bg-transparent shrink-0",
        "px-4 sm:px-6 md:px-8",
        "pt-[env(safe-area-inset-top)]",
        "flex-row"
      )}
    >
      {/* Section 1: Title/Greeting - always visible */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {title && (
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Section 2: Search, Date, Language, Theme, User - condensed on mobile */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
        {/* Search - hidden on mobile, shown on tablet+ */}
        {showSearch && !isMobile && (
          <div className="relative hidden md:block">
            <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${dir === "rtl" ? "right-3" : "left-3"}`} />
            <Input
              type="search"
              placeholder={`${t("search")}...`}
              className={`h-10 w-48 lg:w-80 rounded-xl bg-card/80 backdrop-blur-sm border-border/50 shadow-sm ${dir === "rtl" ? "pr-10 pl-4" : "pl-10 pr-4"}`}
            />
          </div>
        )}

        {/* Date & Time Badge - hidden on small mobile */}
        {!isMobile && (
          <div className="hidden lg:flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm">
            <Calendar className="h-4 w-4" />
            <span>{currentDate}</span>
            <span className="mx-1">•</span>
            <span>{currentTime}</span>
          </div>
        )}

        {/* Notifications */}
        <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px] h-10 w-10 rounded-xl hover:bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className={`absolute top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background animate-pulse ${dir === "rtl" ? "left-2" : "right-2"}`} />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align={dir === "rtl" ? "start" : "end"}>
            <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">{t("notifications")}</h4>
                {unreadCount > 0 && (
                  <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    {unreadCount} {t("newCount")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={markAllAsRead}
                  title={t("markAllAsRead")}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={clearAllNotifications}
                  title={t("clearAll")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
                  <div className="bg-muted/50 p-3 rounded-full">
                    <Bell className="h-6 w-6 opacity-40" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("allCaughtUp")}</p>
                    <p className="text-xs">{t("noNewNotifications")}</p>
                  </div>
                </div>
              ) : (
                <div className="grid">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`group relative grid gap-1 border-b p-4 last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${notification.type === 'ERROR' ? 'bg-red-500' :
                          notification.type === 'WARNING' ? 'bg-yellow-500' :
                            notification.type === 'SUCCESS' ? 'bg-green-500' : 'bg-blue-500'
                          }`} />
                        <div className="grid gap-1 flex-1">
                          <p className={`text-sm leading-none ${!notification.isRead ? 'font-semibold' : 'font-medium'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {new Date(notification.createdAt).toLocaleString(language === "ar" ? "ar-SA" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 hover:bg-destructive/10 hover:text-destructive ${dir === "rtl" ? "left-2" : "right-2"}`}
                          onClick={(e) => deleteNotification(notification.id, e)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-10 w-10 min-h-[44px] min-w-[44px] cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.name || 'User'}`} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {currentUser?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={dir === "rtl" ? "start" : "end"} className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{t("myAccount")}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {currentUser?.name || t("userLabel")}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
              <Settings className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
              <span>{t("settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
              <span>{t("logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
