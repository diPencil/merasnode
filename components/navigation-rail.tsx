"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
    LayoutDashboard,
    Users,
    MessageSquare,
    FileText,
    Activity,
    Settings,
    Link as LinkIcon,
    LogOut,
    Building2,
    Tag,
    BarChart3,
    Receipt,
    TrendingUp,
    TrendingDown,
    Calendar,
    UserPlus,
    Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/lib/i18n"
import { getUserRole, logout, authenticatedFetch } from "@/lib/auth"
import { canAccessPage, type PageRoute } from "@/lib/permissions"

// All menu items grouped for visual clarity
const MENU_GROUPS = [
    {
        id: "main",
        items: [
            { icon: LayoutDashboard, label: "dashboard", href: "/dashboard" },
            { icon: MessageSquare, label: "inbox", href: "/inbox" },
            { icon: Calendar, label: "bookings", href: "/bookings" },
        ],
    },
    {
        id: "crm",
        items: [
            { icon: Users, label: "contacts", href: "/contacts" },
            { icon: Building2, label: "branches", href: "/branches" },
            { icon: Tag, label: "offers", href: "/offers" },
            { icon: Receipt, label: "invoices", href: "/invoices" },
        ],
    },
    {
        id: "automation",
        items: [
            { icon: FileText, label: "templates", href: "/templates" },
            { icon: Bot, label: "botFlows", href: "/bot-flows" },
        ],
    },
    {
        id: "system",
        items: [
            { icon: BarChart3, label: "analytics", href: "/analytics" },
            { icon: UserPlus, label: "users", href: "/users" },
            { icon: LinkIcon, label: "whatsappAccounts", href: "/accounts" },
            { icon: Activity, label: "activityLogs", href: "/logs" },
        ],
    },
]

export function NavigationRail() {
    const pathname = usePathname()
    const router = useRouter()
    const { t, dir } = useI18n()
    const [filteredGroups, setFilteredGroups] = useState(MENU_GROUPS)
    const [companyName, setCompanyName] = useState("")
    const [companyLogo, setCompanyLogo] = useState("")
    const [companyDisplayType, setCompanyDisplayType] = useState<"text" | "logo">("text")

    useEffect(() => {
        const userRole = getUserRole()
        if (userRole) {
            const filtered = MENU_GROUPS.map(group => ({
                ...group,
                items: group.items.filter(item =>
                    canAccessPage(userRole as any, item.href as PageRoute)
                ),
            })).filter(group => group.items.length > 0)
            setFilteredGroups(filtered)
        }
    }, [])

    useEffect(() => {
        authenticatedFetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.settings) {
                    setCompanyName(data.settings.companyName || "")
                    setCompanyLogo(data.settings.companyLogo || "")
                    setCompanyDisplayType(data.settings.companyDisplayType || "text")
                }
            })
            .catch(err => console.error('Error fetching settings:', err))
    }, [])

    return (
        <aside
            className={cn(
                "flex w-56 h-full flex-col bg-sidebar",
                dir === "rtl" ? "border-s border-border/40" : "border-e border-border/40",
            )}
        >
            {/* Logo / Brand */}
            <div className="flex h-16 items-center gap-2 border-b border-border/40 px-4 shrink-0">
                {companyDisplayType === "logo" && companyLogo ? (
                    <>
                        <img
                            src={companyLogo}
                            alt={companyName || "Company Logo"}
                            className="h-8 w-8 object-contain rounded-lg"
                        />
                        {companyName && (
                            <span className="text-lg font-bold text-sidebar-foreground truncate">
                                {companyName}
                            </span>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                            {companyName ? companyName.charAt(0).toUpperCase() : "M"}
                        </div>
                        <span className="text-lg font-bold text-sidebar-foreground truncate">
                            {companyName || "Meras"}
                        </span>
                    </>
                )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-1.5 p-3 border-b border-border/40 shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-row justify-start gap-2 text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground h-9 text-start"
                    onClick={() => router.push('/templates')}
                >
                    <TrendingUp className="h-4 w-4 shrink-0 order-first" />
                    {t("createTemplate")}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-row justify-start gap-2 text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground h-9 text-start"
                    onClick={() => router.push('/bot-flows/create')}
                >
                    <TrendingDown className="h-4 w-4 shrink-0 order-first" />
                    {t("createBotFlow")}
                </Button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto py-2 px-3 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {filteredGroups.map((group, groupIndex) => (
                    <div key={group.id}>
                        {groupIndex > 0 && (
                            <Separator className="my-2 opacity-40" />
                        )}
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const Icon = item.icon
                                const isActive =
                                    pathname === item.href ||
                                    pathname?.startsWith(item.href + "/")

                                return (
                                    <Link key={item.href} href={item.href}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "w-full flex flex-row justify-start gap-3 transition-all duration-200 rounded-xl h-10 font-medium text-start",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <Icon className="h-5 w-5 shrink-0 order-first" />
                                            <span className="text-sm truncate">{t(item.label)}</span>
                                        </Button>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom: Settings + Logout */}
            <div className="space-y-1 p-3 border-t border-border/40 shrink-0">
                <Link href="/settings">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "w-full flex flex-row justify-start gap-3 rounded-xl h-10 font-medium text-start",
                            pathname === "/settings"
                                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <Settings className="h-5 w-5 shrink-0 order-first" />
                        <span className="text-sm">{t("settings")}</span>
                    </Button>
                </Link>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="w-full flex flex-row justify-start gap-3 rounded-xl h-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive font-medium text-start"
                >
                    <LogOut className="h-5 w-5 shrink-0 order-first" />
                    <span className="text-sm">{t("logout")}</span>
                </Button>
            </div>
        </aside>
    )
}
