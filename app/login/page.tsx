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
import "./astronaut.css"

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
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-200 via-purple-300 to-indigo-300 p-4 font-sans" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl md:flex-row md:h-[600px]">

                {/* Left Side: Dark Astronaut Theme */}
                <div className="relative w-full md:w-1/2 bg-[#171717]">
                    <div className="astronaut-card">
                        {/* Moon/Planet glow effect via CSS ::after/before */}
                        <div className="heading">
                            {/* Stars added via CSS ::before */}
                        </div>

                        {/* Astronaut Image - Replacing local img with a high-quality 3D one */}
                        <img
                            src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Astronaut.png"
                            alt="Astronaut"
                            className="image"
                        />

                        <div className="z-10 mt-8 text-center space-y-1">
                            <h2 className="text-xl font-bold tracking-wider text-white">OMNICHANNEL SYSTEM</h2>
                            <p className="text-sm text-gray-400">Meras Holding Company</p>
                        </div>

                        {/* Footer Logos Placeholder */}
                        <div className="mt-auto pt-8 flex items-center justify-center gap-6 opacity-80 icons z-10 w-full px-8 pb-4">
                            {/* Using text for logos based on reference, styled to look like brands */}
                            <div className="text-white text-xs font-bold font-serif">Kayan</div>
                            <div className="text-white text-xs font-bold">BURA</div>
                            <div className="text-white text-xs font-bold">mozdanh</div>
                            <div className="text-white text-xs font-bold flex items-center gap-1">
                                <span>MERAS</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="flex w-full flex-col items-center justify-center bg-white p-8 md:w-1/2 md:p-12">
                    <div className="w-full max-w-sm space-y-8">
                        <div className="text-center space-y-2">
                            <h1 className="text-3xl font-bold text-gray-900">{t("systemTitle")}</h1>
                            <p className="text-sm text-purple-600 font-semibold">{t("systemSubtitle")}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
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
                                    className="h-12 rounded-lg border-gray-200 bg-gray-50 px-4 focus:border-purple-500 focus:ring-purple-500 transition-all shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
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
                                        className="h-12 rounded-lg border-gray-200 bg-gray-50 px-4 focus:border-purple-500 focus:ring-purple-500 transition-all shadow-sm pe-12"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute end-1 top-1/2 h-9 w-9 -translate-y-1/2 text-gray-400 hover:text-purple-600"
                                        onClick={() => setShowPassword((p) => !p)}
                                        disabled={isLoading}
                                        aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="h-12 w-full rounded-full bg-[#52449F] hover:bg-[#433785] text-white text-base font-medium shadow-lg shadow-purple-200 transition-all mt-6"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t("signingIn")}
                                    </>
                                ) : (
                                    t("signIn")
                                )}
                            </Button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-xs text-gray-400">
                                {t("copyright").replace("{year}", String(new Date().getFullYear()))}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
