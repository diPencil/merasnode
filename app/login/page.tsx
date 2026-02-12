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
        <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-purple-200 via-purple-300 to-indigo-300 p-4 font-sans" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl md:flex-row md:h-[650px]">

                {/* Left Side: Dark Astronaut Theme - Matching Reference Layout */}
                <div className="relative w-full md:w-1/2 bg-[#171717]">
                    <div className="card w-full h-full flex flex-col justify-between p-8 relative">
                        {/* Moon/Stars Effects via CSS ::after/before */}
                        <div className="heading absolute top-0 left-0 w-full h-full pointer-events-none z-0"></div>
                        <div className="icons absolute top-0 left-0 w-full h-full pointer-events-none z-0"></div>

                        {/* Top Section: Moon (CSS) & Astronaut */}
                        <div className="flex-1 flex items-center justify-center relative z-10 w-full">
                            <img
                                src="/astronaut.webp"
                                alt="Astronaut"
                                className="astronaut-img w-64 md:w-80 object-contain drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                                style={{
                                    transform: "translateY(-20px)"
                                }}
                            />
                        </div>

                        {/* Bottom Section: Text Overlay - Left Aligned */}
                        <div className="z-20 w-full space-y-4 text-left">
                            <div className="inline-block rounded-full bg-purple-600 px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase shadow-[0_0_15px_rgba(147,51,234,0.6)] border border-purple-500/50">
                                NEXT GEN PLATFORM
                            </div>

                            <h2 className="text-4xl font-black tracking-normal text-white uppercase leading-none drop-shadow-xl md:text-5xl">
                                MERAS <br /> UNIVERSE
                            </h2>

                            <p className="text-gray-400 text-xs leading-relaxed font-medium max-w-sm">
                                Welcome to your centralized command center. Manage operations for Kayan, Bura, and Mozdanh with seamlessly integrated tools designed to elevate efficiency and customer experience.
                            </p>

                            {/* Footer Logos - Row at bottom left */}
                            <div className="pt-6 flex items-center justify-start opacity-100">
                                <img
                                    src="/meraslogos.png"
                                    alt="Meras Companies"
                                    className="h-8 md:h-10 w-auto object-contain brightness-0 invert opacity-90 hover:opacity-100 transition-opacity"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="flex w-full flex-col items-center justify-center bg-white p-8 md:w-1/2 md:p-16 relative z-20">
                    <div className="w-full max-w-md space-y-8">
                        <div className="text-center space-y-3">
                            <h1 className="text-3xl font-extrabold text-[#1a1a1a] tracking-tight">{t("systemTitle")}</h1>
                            <p className="text-sm text-purple-700 font-bold">{t("systemSubtitle")}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 mt-10">
                            <div className="space-y-2 text-start">
                                <Label htmlFor="email" className="text-sm font-bold text-gray-700">
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
                                    className="h-14 rounded-2xl border-gray-100 bg-gray-50 px-5 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all shadow-sm text-base font-medium placeholder:text-gray-400"
                                />
                            </div>

                            <div className="space-y-2 text-start">
                                <Label htmlFor="password" className="text-sm font-bold text-gray-700">
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
                                        className="h-14 rounded-2xl border-gray-100 bg-gray-50 px-5 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all shadow-sm pe-12 text-base font-medium placeholder:text-gray-400"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute end-2 top-1/2 h-10 w-10 -translate-y-1/2 text-gray-400 hover:text-purple-600 rounded-xl hover:bg-purple-50"
                                        onClick={() => setShowPassword((p) => !p)}
                                        disabled={isLoading}
                                        aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="h-14 w-full rounded-2xl bg-[#52449F] hover:bg-[#433785] text-white text-lg font-bold shadow-xl shadow-purple-200 hover:shadow-purple-300 transition-all mt-8 active:scale-[0.98] duration-200"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        {t("signingIn")}
                                    </>
                                ) : (
                                    t("signIn")
                                )}
                            </Button>
                        </form>

                        <div className="mt-auto pt-8 text-center">
                            <p className="text-xs text-gray-400 font-medium">
                                {t("copyright").replace("{year}", String(new Date().getFullYear()))}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
