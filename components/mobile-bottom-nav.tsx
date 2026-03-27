"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Building2,
  Tag,
  Receipt,
  FileText,
  Bot,
  BarChart3,
  UserPlus,
  Link as LinkIcon,
  Activity,
  Settings,
  LogOut,
  MessagesSquare,
} from "lucide-react"
import { getUserRole, logout } from "@/lib/auth"
import { canAccessPage, type PageRoute } from "@/lib/permissions"

const PRIMARY_NAV = [
  { icon: LayoutDashboard, label: "dashboard", href: "/dashboard" },
  { icon: MessageSquare, label: "inbox", href: "/inbox" },
  { icon: Users, label: "contacts", href: "/contacts" },
  { icon: Calendar, label: "bookings", href: "/bookings" },
]

const EXTRA_NAV = [
  { icon: Building2, label: "branches", href: "/branches" },
  { icon: Tag, label: "offers", href: "/offers" },
  { icon: Receipt, label: "invoices", href: "/invoices" },
  { icon: FileText, label: "templates", href: "/templates" },
  { icon: Bot, label: "botFlows", href: "/bot-flows" },
  { icon: BarChart3, label: "analytics", href: "/analytics" },
  { icon: UserPlus, label: "users", href: "/users" },
  { icon: MessagesSquare, label: "internalChat", href: "/internal-chat" },
  { icon: LinkIcon, label: "whatsappAccounts", href: "/accounts" },
  { icon: Activity, label: "activityLogs", href: "/logs" },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filteredExtra, setFilteredExtra] = useState(EXTRA_NAV)

  useEffect(() => {
    const role = getUserRole()
    if (role) {
      const filtered = EXTRA_NAV.filter((item) =>
        canAccessPage(role as any, item.href as PageRoute)
      )
      setFilteredExtra(filtered)
    }
  }, [])

  return (
    <>
      {/* Bottom navigation bar - fixed, safe area aware */}
      <nav
        className={cn(
          "fixed bottom-0 inset-x-0 z-40 flex items-center justify-around",
          "bg-background/95 backdrop-blur",
          "border-t border-border",
          "pb-[env(safe-area-inset-bottom)] pt-2",
          "min-h-[56px]"
        )}
      >
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-lg active:scale-95 transition-transform",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-6 w-6 shrink-0" />
              <span className="text-[10px] font-medium">{t(item.label)}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-lg active:scale-95 transition-transform",
            pathname === "/settings" ||
              pathname === "/branches" ||
              pathname === "/offers" ||
              pathname === "/invoices" ||
              pathname === "/templates" ||
              pathname === "/bot-flows" ||
              pathname === "/analytics" ||
              pathname === "/users" ||
              pathname === "/internal-chat" ||
              pathname === "/accounts" ||
              pathname === "/logs"
              ? "text-primary"
              : "text-muted-foreground"
          )}
          aria-label={t("more")}
        >
          <MoreHorizontal className="h-6 w-6 shrink-0" />
          <span className="text-[10px] font-medium">{t("more")}</span>
        </button>
      </nav>

      {/* More menu - full-screen sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="bottom"
          className="h-[85dvh] rounded-t-2xl p-0 flex flex-col sm:mx-auto sm:max-w-lg"
        >
          <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <SheetTitle>{t("more")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="space-y-1">
              {filteredExtra.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + "/")
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-12 text-base font-medium gap-3",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => {
                      router.push(item.href)
                      setDrawerOpen(false)
                    }}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {t(item.label)}
                  </Button>
                )
              })}
            </div>
            <Separator className="my-4" />
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start h-12 text-base font-medium gap-3"
                onClick={() => {
                  router.push("/settings")
                  setDrawerOpen(false)
                }}
              >
                <Settings className="h-5 w-5 shrink-0" />
                {t("settings")}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-12 text-base font-medium gap-3 text-destructive"
                onClick={() => {
                  logout()
                  setDrawerOpen(false)
                }}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {t("logout")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
