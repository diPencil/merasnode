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

                {/* Left Side: Dark Astronaut Theme - Exactly matching provided CSS structure */}
                <div className="relative w-full md:w-1/2 p-0 bg-[#171717]">
                    <div className="card">
                        {/* CSS Effects Layers */}
                        <div className="heading"></div>
                        <div className="icons"></div>

                        {/* Astronaut Image - Fluent 3D applied with Purple Hue Filter to match reference */}
                        <img
                            src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Astronaut.png"
                            alt="Astronaut"
                            className="astronaut-img"
                            style={{
                                filter: "hue-rotate(260deg) saturate(1.2) drop-shadow(0 0 15px rgba(139,92,246,0.5))",
                                maxWidth: "70%"
                            }}
                        />

                        {/* Text Overlay */}
                        <div className="z-10 text-center space-y-4 mt-6 relative max-w-md px-6">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black tracking-widest text-white uppercase drop-shadow-lg">MERAS UNIVERSE</h2>
                                <p className="text-purple-300 font-bold tracking-[0.2em] text-sm uppercase">NEXT GEN PLATFORM</p>
                            </div>

                            <p className="text-gray-300 text-xs md:text-sm leading-relaxed font-medium opacity-90 max-w-xs mx-auto text-balance">
                                Welcome to your centralized command center. Manage operations for Kayan, Bura, and Mozdanh with seamlessly integrated tools designed to elevate efficiency and customer experience.
                            </p>
                        </div>

                        {/* Footer Logos */}
                        <div className="mt-12 w-full px-8 z-10 flex justify-center items-center opacity-90 hover:opacity-100 transition-opacity">
                            <img
                                src="/meraslogos.png"
                                alt="Meras Companies"
                                className="h-8 md:h-8 w-auto object-contain brightness-0 invert"
                            />
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
