"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { login } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { t, language } = useI18n()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const isRtl = language === "ar"

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const result = await login(email, password)
            if (result.success) {
                toast({
                    title: t("loginSuccess"),
                    description: `${t("welcomeBack")}, ${result.data?.user.name}!`,
                })
                router.push("/dashboard")
            } else {
                toast({
                    title: t("loginFailed"),
                    description: result.error || t("invalidCredentials"),
                    variant: "destructive",
                })
            }
        } catch {
            toast({
                title: t("error"),
                description: t("unexpectedError"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Left: Branding panel (desktop) / Top strip (mobile) — after form on mobile via order */}
            <section
                className="relative order-2 flex shrink-0 flex-col justify-center px-6 py-6 md:order-1 md:w-[45%] md:min-h-screen md:px-12 md:py-16 lg:w-[48%] lg:px-16"
                aria-hidden
            >
                <div className="absolute inset-0 bg-linear-to-br from-violet-600/95 via-indigo-600/90 to-blue-700/95" />
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute bottom-1/4 right-0 h-48 w-48 rounded-full bg-indigo-400/20 blur-2xl" />
                    <div className="absolute left-1/3 top-1/2 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
                </div>
                <div className="relative z-10 text-white">
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl lg:text-[2rem]">
                        {t("systemTitle")}
                    </h1>
                    <p className="mt-2 max-w-sm text-sm font-medium text-white/90 md:mt-4 md:text-base">
                        {t("brandTagline")}
                    </p>
                    <p className="mt-4 text-xs font-medium text-white/70 md:mt-6 md:text-sm">
                        {t("systemSubtitle")}
                    </p>
                </div>
            </section>

            {/* Right: Login form — first on mobile */}
            <main
                className="order-1 flex min-h-[70vh] flex-1 flex-col items-center justify-center px-4 py-10 md:order-2 md:min-h-screen md:px-8 md:py-12"
                role="main"
            >
                <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                    <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-lg shadow-black/5 dark:shadow-black/20 sm:p-8 md:rounded-[16px] md:p-10">
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                {t("systemTitle")}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t("systemSubtitle")}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    {t("emailOrUsernameLabel")}
                                </Label>
                                <Input
                                    id="email"
                                    type="text"
                                    autoComplete="username"
                                    placeholder={t("placeholderEmailOrUsername")}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="h-12 rounded-xl border-border/80 bg-background px-4 transition-colors focus-visible:ring-2 disabled:opacity-60"
                                    aria-invalid={false}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">
                                    {t("passwordLabel")}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        placeholder={t("placeholderPassword")}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        className="h-12 rounded-xl border-border/80 bg-background pe-12 ps-4 transition-colors focus-visible:ring-2 disabled:opacity-60"
                                        aria-invalid={false}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute end-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2"
                                        onClick={() => setShowPassword((p) => !p)}
                                        disabled={isLoading}
                                        aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" aria-hidden />
                                        ) : (
                                            <Eye className="h-4 w-4" aria-hidden />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="h-12 w-full rounded-xl text-base font-medium shadow-sm transition-all hover:opacity-95 focus-visible:ring-2 disabled:opacity-70"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                        {t("signingIn")}
                                    </>
                                ) : (
                                    t("signIn")
                                )}
                            </Button>
                        </form>
                    </div>

                    <p
                        className="mt-8 text-center text-xs text-muted-foreground"
                        dir={isRtl ? "rtl" : "ltr"}
                    >
                        {t("copyright").replace("{year}", String(new Date().getFullYear()))}
                    </p>
                </div>
            </main>
        </div>
    )
}
