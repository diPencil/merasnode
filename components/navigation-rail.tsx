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
    FilePlus,
    Workflow
} from "lucide-react"
import { QuickCreateTemplateDialog } from "@/components/quick-create-template-dialog"
import { QuickCreateBotFlowDialog } from "@/components/quick-create-bot-flow-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { getUserRole, logout, getUser, authenticatedFetch } from "@/lib/auth"
import { canAccessPage, type PageRoute } from "@/lib/permissions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const GROUP_LABELS: Record<string, string> = {
    main: "navigation",
    crm: "crmLabel",
    automation: "automationLabel",
    system: "systemLabel",
}

const MENU_GROUPS = [
    { id: "main", items: [{ icon: LayoutDashboard, label: "dashboard", href: "/dashboard" }, { icon: MessageSquare, label: "inbox", href: "/inbox" }, { icon: Calendar, label: "bookings", href: "/bookings" }] },
    { id: "crm", items: [{ icon: Users, label: "contacts", href: "/contacts" }, { icon: Building2, label: "branches", href: "/branches" }, { icon: Tag, label: "offers", href: "/offers" }, { icon: Receipt, label: "invoices", href: "/invoices" }] },
    { id: "automation", items: [{ icon: FileText, label: "templates", href: "/templates" }, { icon: Bot, label: "botFlows", href: "/bot-flows" }] },
    { id: "system", items: [{ icon: BarChart3, label: "analytics", href: "/analytics" }, { icon: UserPlus, label: "users", href: "/users" }, { icon: LinkIcon, label: "whatsappAccounts", href: "/accounts" }, { icon: Activity, label: "activityLogs", href: "/logs" }] },
]

export function NavigationRail() {
    const pathname = usePathname()
    const router = useRouter()
    const { t, dir } = useI18n()
    const [filteredGroups, setFilteredGroups] = useState(MENU_GROUPS)
    const [companyName, setCompanyName] = useState("")
    const [companyLogo, setCompanyLogo] = useState("")
    const [companyDisplayType, setCompanyDisplayType] = useState<"text" | "logo">("text")
    const [currentUser, setCurrentUser] = useState<{ name?: string; role?: string } | null>(null)
    const [quickCreateTemplateOpen, setQuickCreateTemplateOpen] = useState(false)
    const [quickCreateBotFlowOpen, setQuickCreateBotFlowOpen] = useState(false)

    useEffect(() => {
        setCurrentUser(getUser())
    }, [])

    useEffect(() => {
        const userRole = getUserRole()
        if (userRole) {
            const filtered = MENU_GROUPS.map((group) => ({
                ...group,
                items: group.items.filter((item) =>
                    canAccessPage(userRole as any, item.href as PageRoute)
                ),
            })).filter((g) => g.items.length > 0)
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

    const userInitials = currentUser?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"
    const roleLabel = currentUser?.role ? currentUser.role.charAt(0) + currentUser.role.slice(1).toLowerCase() : ""

    return (
        <aside
            className={cn(
                "flex w-[240px] h-full min-h-0 flex-col bg-sidebar overflow-hidden",
                "overscroll-contain",
                dir === "rtl" ? "border-s border-border/40" : "border-e border-border/40",
            )}
        >
            {/* Logo / Brand (FIXED — never scrolls) */}
            <div className="flex h-16 items-center gap-2.5 border-b border-border/40 px-4 shrink-0">
                {companyDisplayType === "logo" && companyLogo ? (
                    <>
                        <img
                            src={companyLogo}
                            alt={companyName || t("companyLogoAlt")}
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

            {/* Quick Actions (FIXED — never scrolls): open creation modals directly */}
            <div className="flex flex-col gap-1.5 p-3 border-b border-border/40 shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-row justify-start gap-2 text-xs font-medium hover:bg-primary/10 hover:text-primary text-muted-foreground h-9 text-start transition-colors"
                    onClick={() => setQuickCreateTemplateOpen(true)}
                >
                    <FilePlus className="h-4 w-4 shrink-0 order-first" />
                    {t("createTemplate")}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-row justify-start gap-2 text-xs font-medium hover:bg-primary/10 hover:text-primary text-muted-foreground h-9 text-start transition-colors"
                    onClick={() => setQuickCreateBotFlowOpen(true)}
                >
                    <Workflow className="h-4 w-4 shrink-0 order-first" />
                    {t("createBotFlow")}
                </Button>
            </div>
            <QuickCreateTemplateDialog open={quickCreateTemplateOpen} onOpenChange={setQuickCreateTemplateOpen} />
            <QuickCreateBotFlowDialog open={quickCreateBotFlowOpen} onOpenChange={setQuickCreateBotFlowOpen} />

            {/* Navigation Menu (SCROLLABLE — only this section scrolls) */}
            <nav className="flex-1 min-h-0 py-2 px-3 sidebar-nav-scroll">
                {filteredGroups.map((group, groupIndex) => (
                    <div key={group.id} className={groupIndex > 0 ? "mt-4" : ""}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 mb-1.5">
                            {t(GROUP_LABELS[group.id] || group.id)}
                        </p>
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                                return (
                                    <Link key={item.href} href={item.href}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "w-full flex flex-row justify-start gap-3 transition-all duration-200 rounded-lg h-9 font-medium text-start",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                            )}
                                        >
                                            <Icon className="h-[18px] w-[18px] shrink-0 order-first" />
                                            <span className="text-[13px] truncate">{t(item.label)}</span>
                                        </Button>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom: User profile + Settings + Logout (FIXED — never scrolls) */}
            <div className="border-t border-border/40 shrink-0">
                {currentUser && (
                    <div
                        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push('/settings')}
                    >
                        <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {userInitials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
                                {currentUser.name || t("userLabel")}
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                                {roleLabel}
                            </p>
                        </div>
                    </div>
                )}
                <div className="space-y-0.5 px-3 pb-3 pt-1">
                    <Link href="/settings">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "w-full flex flex-row justify-start gap-3 rounded-lg h-9 font-medium text-start",
                                pathname === "/settings"
                                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                        >
                            <Settings className="h-[18px] w-[18px] shrink-0 order-first" />
                            <span className="text-[13px]">{t("settings")}</span>
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={logout}
                        className="w-full flex flex-row justify-start gap-3 rounded-lg h-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive font-medium text-start"
                    >
                        <LogOut className="h-[18px] w-[18px] shrink-0 order-first" />
                        <span className="text-[13px]">{t("logout")}</span>
                    </Button>
                </div>
            </div>
        </aside>
    )
}
