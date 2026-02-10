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
    Calendar,
    UserPlus,
    Bot,
    ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/lib/i18n"
import { getUserRole, logout, authenticatedFetch } from "@/lib/auth"
import { canAccessPage, type PageRoute } from "@/lib/permissions"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

// Grouped menu items for visual clarity
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
        <TooltipProvider delayDuration={0}>
            <aside
                className={cn(
                    "flex h-full w-[240px] flex-col bg-sidebar",
                    dir === "rtl" ? "border-s border-border/50" : "border-e border-border/50",
                )}
            >
                {/* Brand / Logo */}
                <div className="flex h-14 items-center gap-2.5 px-5 shrink-0">
                    {companyDisplayType === "logo" && companyLogo ? (
                        <>
                            <img
                                src={companyLogo}
                                alt={companyName || "Logo"}
                                className="h-7 w-7 object-contain rounded-md"
                            />
                            {companyName && (
                                <span className="text-[15px] font-semibold text-sidebar-foreground truncate">
                                    {companyName}
                                </span>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                                {companyName ? companyName.charAt(0).toUpperCase() : "M"}
                            </div>
                            <span className="text-[15px] font-semibold text-sidebar-foreground truncate">
                                {companyName || "Meras"}
                            </span>
                        </>
                    )}
                </div>

                <Separator className="opacity-50" />

                {/* Navigation groups */}
                <nav className="flex-1 overflow-y-auto py-2 px-3">
                    {filteredGroups.map((group, groupIndex) => (
                        <div key={group.id}>
                            {groupIndex > 0 && (
                                <Separator className="my-2 opacity-40" />
                            )}
                            <ul className="space-y-0.5">
                                {group.items.map((item) => {
                                    const Icon = item.icon
                                    const isActive =
                                        pathname === item.href ||
                                        pathname?.startsWith(item.href + "/")

                                    return (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                                                    isActive
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                                )}
                                            >
                                                <Icon
                                                    className={cn(
                                                        "h-[18px] w-[18px] shrink-0 transition-colors",
                                                        isActive
                                                            ? "text-primary"
                                                            : "text-muted-foreground/70 group-hover:text-accent-foreground",
                                                    )}
                                                />
                                                <span className="truncate">{t(item.label)}</span>
                                                {isActive && (
                                                    <ChevronRight
                                                        className={cn(
                                                            "h-3.5 w-3.5 shrink-0 opacity-60",
                                                            dir === "rtl" ? "me-auto rotate-180" : "ms-auto",
                                                        )}
                                                    />
                                                )}
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* Bottom section */}
                <div className="shrink-0 border-t border-border/50 p-3 space-y-0.5">
                    <Link
                        href="/settings"
                        className={cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                            pathname === "/settings"
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                    >
                        <Settings className="h-[18px] w-[18px] shrink-0 text-muted-foreground/70 group-hover:text-accent-foreground" />
                        <span>{t("settings")}</span>
                    </Link>

                    <button
                        onClick={logout}
                        className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                        <LogOut className="h-[18px] w-[18px] shrink-0 text-muted-foreground/70 group-hover:text-destructive" />
                        <span>{t("logout")}</span>
                    </button>
                </div>
            </aside>
        </TooltipProvider>
    )
}
