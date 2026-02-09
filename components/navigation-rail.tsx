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
    Bell,
    TrendingUp,
    TrendingDown,
    Calendar,
    UserPlus,
    Bot
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/lib/i18n"
import { getUserRole, logout } from "@/lib/auth"
import { canAccessPage, type PageRoute } from "@/lib/permissions"

const menuItems = [
    { icon: LayoutDashboard, label: "dashboard", href: "/dashboard" },
    { icon: MessageSquare, label: "inbox", href: "/inbox" },
    { icon: Calendar, label: "bookings", href: "/bookings" },
    { icon: Users, label: "contacts", href: "/contacts" },
    { icon: Building2, label: "branches", href: "/branches" },
    { icon: Tag, label: "offers", href: "/offers" },
    { icon: Receipt, label: "invoices", href: "/invoices" },
    { icon: FileText, label: "templates", href: "/templates" },
    { icon: Bot, label: "botFlows", href: "/bot-flows" },
    { icon: BarChart3, label: "analytics", href: "/analytics" },
    { icon: UserPlus, label: "users", href: "/users" },
    { icon: LinkIcon, label: "whatsappAccounts", href: "/accounts" },
    { icon: Activity, label: "activityLogs", href: "/logs" },
]

export function NavigationRail() {
    const pathname = usePathname()
    const router = useRouter()
    const { t, dir } = useI18n()
    const [filteredMenuItems, setFilteredMenuItems] = useState(menuItems)
    const [companyName, setCompanyName] = useState("")
    const [companyLogo, setCompanyLogo] = useState("")
    const [companyDisplayType, setCompanyDisplayType] = useState<"text" | "logo">("text")

    useEffect(() => {
        const userRole = getUserRole()
        if (userRole) {
            const filtered = menuItems.filter(item =>
                canAccessPage(userRole as any, item.href as PageRoute)
            )
            setFilteredMenuItems(filtered)
        }
    }, [])

    useEffect(() => {
        // Fetch settings to display company name or logo
        fetch('/api/settings')
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
                "flex w-56 flex-col bg-sidebar border-border/40",
                // في RTL نريد أن يكون الحد من الجهة اليسار (start في RTL)
                dir === "rtl" ? "border-s" : "border-e",
            )}
        >
            {/* Logo Section */}
            <div className="flex h-16 items-center gap-2 border-b border-border/40 px-4">
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
            <div className="flex flex-col gap-2 p-4 border-b border-border/40">
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-row justify-start gap-2 text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground h-9 text-start"
                    onClick={() => router.push('/templates')}
                >
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    {t("createTemplate")}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-row justify-start gap-2 text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground h-9 text-start"
                    onClick={() => router.push('/bot-flows/create')}
                >
                    <TrendingDown className="h-4 w-4 shrink-0" />
                    {t("createBotFlow")}
                </Button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 space-y-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {filteredMenuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")

                    return (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "w-full flex flex-row justify-start gap-3 transition-all duration-200 rounded-xl h-11 font-medium text-start",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-md hover:bg-primary hover:text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className="h-5 w-5 shrink-0 order-first" />
                                <span className="text-sm">{t(item.label)}</span>
                            </Button>
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom Section */}
            <div className="space-y-1 p-3 border-t border-border/40">
                <Link href="/settings">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full flex flex-row justify-start gap-3 rounded-xl h-11 text-muted-foreground hover:bg-muted hover:text-foreground font-medium text-start"
                    >
                        <Settings className="h-5 w-5 shrink-0 order-first" />
                        <span className="text-sm">{t("settings")}</span>
                    </Button>
                </Link>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="w-full flex flex-row justify-start gap-3 rounded-xl h-11 text-muted-foreground hover:bg-muted hover:text-foreground font-medium text-start"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0 order-first">
                        <LogOut className="h-4 w-4" />
                    </div>
                    <span className="text-sm">{t("logout")}</span>
                </Button>
            </div>
        </aside>
    )
}
