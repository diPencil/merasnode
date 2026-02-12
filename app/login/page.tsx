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
        <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-purple-200 via-purple-300 to-indigo-300 p-4 font-sans" dir={isRtl ? "rtl" : "ltr"}>
            {/* Main Container: Rounded-3xl on mobile, Rounded-[40px] on desktop to match reference */}
            <div className="flex w-full max-w-[1100px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:flex-row md:h-[700px] md:rounded-[40px]">

                {/* 
                   LEFT SIDE: Astronaut & Universe Theme 
                   Note: Kept usually in LTR for the design aesthetic of the English text, 
                   but we apply RTL flip to the image if needed.
                   For strict adherence to image: Text seems left-aligned English.
                */}
                <div className="relative hidden w-full bg-[#101010] md:block md:h-full md:w-[45%] lg:w-[45%]">
                    {/* Background Elements */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                        {/* Huge Moon/Planet Glow Top Left */}
                        <div className="absolute -top-20 -left-20 w-64 h-64 bg-gray-200/10 rounded-full blur-3xl"></div>
                        <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"></div>

                        {/* Stars (Static dots for performance/cleanliness) */}
                        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full opacity-60"></div>
                        <div className="absolute top-1/3 right-1/4 w-0.5 h-0.5 bg-white rounded-full opacity-40"></div>
                        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-white rounded-full opacity-50"></div>
                        <div className="absolute top-10 right-10 w-0.5 h-0.5 bg-white rounded-full opacity-80"></div>
                    </div>

                    <div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-12">
                        {/* Spacer for top alignment */}
                        <div></div>

                        {/* Astronaut Image - Centered vertically in the available space */}
                        <div className="flex justify-center items-center py-4">
                            <img
                                src="/astronaut.webp"
                                alt="Astronaut"
                                className="w-56 lg:w-72 object-contain drop-shadow-[0_0_40px_rgba(168,85,247,0.3)] animate-float"
                                style={{
                                    animation: 'float 6s ease-in-out infinite',
                                    ...(isRtl && { transform: 'scaleX(-1)' })
                                }}
                            />
                        </div>

                        {/* Bottom Text Content */}
                        <div className="space-y-5 text-left" dir="ltr">
                            {/* Badge */}
                            <div className="inline-block rounded-full bg-[#8B5CF6] px-4 py-1.5 text-[10px] font-extrabold tracking-widest text-white uppercase shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                                NEXT GEN PLATFORM
                            </div>

                            {/* Main Title - Stacked for impact as per reference */}
                            <div className="space-y-0 leading-[0.9]">
                                <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase drop-shadow-lg">
                                    MERAS
                                </h1>
                                <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase drop-shadow-lg">
                                    UNIVERSE
                                </h1>
                            </div>

                            {/* Description */}
                            <p className="max-w-[340px] text-xs lg:text-sm font-medium leading-relaxed text-gray-400">
                                Welcome to your centralized command center. Manage operations for Kayan, Bura, and Mozdanh with seamlessly integrated tools designed to elevate efficiency and customer experience.
                            </p>

                            {/* Logos */}
                            <div className="pt-6">
                                <img
                                    src="/meraslogos.png"
                                    alt="Meras Companies"
                                    className="h-8 lg:h-9 w-auto object-contain brightness-0 invert opacity-90"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 
                    RIGHT SIDE: Login Form 
                    Background: Gradient Purple/Indigo
                    Content: White rounded card floating in center
                */}
                <div className="flex w-full flex-col items-center justify-center bg-linear-to-br from-[#E0CCF7] to-[#9F87FF] p-6 md:w-[55%] lg:w-[55%] relative">

                    {/* The White Card Container */}
                    <div className="w-full max-w-[420px] bg-white rounded-[32px] shadow-2xl p-8 md:p-12 space-y-8">

                        {/* Header */}
                        <div className="text-center space-y-2">
                            {/* Large Arabic Title */}
                            <h2 className="text-2xl font-black text-[#1F1F1F] tracking-tight">
                                {t("systemTitle")}
                            </h2>
                            {/* Subtitle */}
                            <p className="text-sm font-bold text-[#9333EA]">
                                {t("systemSubtitle")}
                            </p>
                        </div>

                        {/* Form Inputs */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-bold text-gray-600 px-2 uppercase tracking-wide">
                                    {t("emailOrUsernameLabel")}
                                </Label>
                                <Input
                                    id="email"
                                    type="text"
                                    placeholder={t("placeholderEmailOrUsername")}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="h-12 rounded-full border-gray-100 bg-gray-50/80 px-5 text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100/50 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-bold text-gray-600 px-2 uppercase tracking-wide">
                                    {t("passwordLabel")}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder={t("placeholderPassword")}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        className="h-12 rounded-full border-gray-100 bg-gray-50/80 px-5 pe-12 text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100/50 transition-all"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute end-1.5 top-1/2 h-9 w-9 -translate-y-1/2 text-gray-400 hover:text-purple-600 rounded-full hover:bg-purple-50"
                                        onClick={() => setShowPassword((p) => !p)}
                                        disabled={isLoading}
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
                                className="mt-4 h-12 w-full rounded-full bg-[#5B4ADB] hover:bg-[#4C3EB8] text-white text-base font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all active:scale-[0.98]"
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
                    </div>

                    {/* Footer Copyright - Outside the card */}
                    <div className="mt-8 text-center px-4">
                        <p className="text-[10px] md:text-xs font-semibold text-[#4C1D95]/60 tracking-wider">
                            {t("copyright").replace("{year}", String(new Date().getFullYear()))}
                        </p>
                    </div>
                </div>
            </div>

            {/* Inline CSS for specific animations if plain Tailwind isn't enough */}
            <style jsx global>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) ${isRtl ? 'scaleX(-1)' : ''}; }
                    50% { transform: translateY(-20px) ${isRtl ? 'scaleX(-1)' : ''}; }
                }
            `}</style>
        </div>
    )
}
