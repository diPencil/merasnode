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
            <div className="flex w-full max-w-[850px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:flex-row md:h-[550px] md:rounded-[40px]">

                {/* 
                   LEFT SIDE: Astronaut & Universe Theme 
                   Note: Kept usually in LTR for the design aesthetic of the English text, 
                   but we apply RTL flip to the image if needed.
                   For strict adherence to image: Text seems left-aligned English.
                */}
                <div className={`card relative hidden w-full bg-[#171717] md:flex md:h-full md:w-[40%] lg:w-[40%] flex-col overflow-hidden ${isRtl ? "items-end" : ""}`}>
                    {/* Astronaut Image Section — صورة معكوسة للعربي من مجلد الصور */}
                    <div className="image flex-1 flex items-center justify-center z-10 w-full" dir="ltr">
                        <img
                            src={isRtl ? "/astronaut - RTL.png" : "/astronaut.webp"}
                            alt="Astronaut"
                            className="astronaut-image w-[65%] object-contain filter drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                        />
                    </div>

                    {/* Bottom Content Section — RTL: محتوى الكارت يمين؛ LTR: يسار */}
                    <div
                        className={`heading z-10 px-8 pb-10 space-y-4 w-full ${isRtl ? "text-right" : "text-left"}`}
                        dir={isRtl ? "rtl" : "ltr"}
                    >
                        <div className={`space-y-4 ${isRtl ? "flex flex-col items-end" : ""}`}>
                            {/* Badge */}
                            <div className="inline-block rounded-full bg-[#8B5CF6] px-3 py-1 text-[9px] font-extrabold tracking-widest text-white uppercase shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                                {t("nextGenPlatform")}
                            </div>

                            {/* Titles */}
                            <div className="space-y-0">
                                <h1 className={`text-xl lg:text-2xl font-black tracking-tighter text-white uppercase flex gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                                    <span>{t("meras")}</span>
                                    <span>{t("universe")}</span>
                                </h1>
                            </div>

                            {/* Description */}
                            <p className={`max-w-[280px] text-[9px] lg:text-[10px] font-bold leading-relaxed text-gray-400 ${isRtl ? "text-end" : ""}`}>
                                {t("brandDescription")}
                            </p>
                        </div>

                        {/* Logos & Icons Area — RTL: اللوجوهات يمين */}
                        <div className={`icons pt-4 flex items-center gap-6 ${isRtl ? "justify-end" : "justify-start"}`}>
                            <div className="instagram">
                                <img
                                    src="/meraslogos.png"
                                    alt="Meras Companies"
                                    className="h-9 lg:h-11 w-auto object-contain brightness-0 invert opacity-90"
                                />
                            </div>
                            <div className="x"></div>
                            <div className="discord"></div>
                        </div>
                    </div>
                </div>

                {/* 
                    RIGHT SIDE: Login Form 
                    Background: Gradient Purple/Indigo
                    Content: White rounded card floating in center
                */}
                <div className="flex w-full flex-col items-center justify-center bg-linear-to-br from-[#E0CCF7] to-[#9F87FF] p-10 md:w-[60%] lg:w-[60%] relative">

                    {/* The White Card Container */}
                    <div className="w-full max-w-[340px] bg-white rounded-[32px] shadow-2xl p-6 md:p-8 space-y-4">

                        {/* Header */}
                        <div className="text-center space-y-1">
                            {/* Large Arabic Title */}
                            <h2 className="text-xl font-black text-[#1F1F1F] tracking-tight">
                                {t("systemTitle")}
                            </h2>
                            <p className="text-xs font-bold text-[#9333EA]">
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
                                className="mt-2 h-10 w-full rounded-full bg-[#5B4ADB] hover:bg-[#4C3EB8] text-white text-sm font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all active:scale-[0.98]"
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

            {/* FULL CSS FROM UIVERSE - STRICT REPRODUCTION */}
            <style jsx global>{`
                .card {
                    position: relative;
                    background-color: #171717;
                    color: white;
                    font-family: inherit;
                    font-weight: bold;
                    z-index: 1;
                }

                .card .astronaut-image {
                    animation: move 10s ease-in-out infinite;
                    z-index: 5;
                }

                .image:hover {
                    cursor: -webkit-grab;
                    cursor: grab;
                }

                .card::before {
                    content: "";
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    inset: -3px;
                    border-radius: 10px;
                    background: radial-gradient(#858585, transparent, transparent);
                    transform: translate(-5px, 250px);
                    transition: 0.4s ease-in-out;
                    z-index: -1;
                }

                .card:hover::before {
                    width: 150%;
                    height: 100%;
                    margin-left: -4.25em;
                }

                .card::after {
                    content: "";
                    position: absolute;
                    inset: 2px;
                    border-radius: 20px;
                    background: rgb(23, 23, 23, 0.7);
                    transition: all 0.4s ease-in-out;
                    z-index: -1;
                }

                .heading {
                    z-index: 2;
                    transition: 0.4s ease-in-out;
                }

                .card:hover .heading {
                    letter-spacing: 0.025em;
                }

                .heading::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 2px;
                    height: 2px;
                    border-radius: 50%;
                    opacity: 1;
                    box-shadow: 220px 118px #fff, 280px 176px #fff, 40px 50px #fff,
                        60px 180px #fff, 120px 130px #fff, 180px 176px #fff, 220px 290px #fff,
                        520px 250px #fff, 400px 220px #fff, 50px 350px #fff, 10px 230px #fff;
                    z-index: -1;
                    transition: 1s ease;
                    animation: 1s glowing-stars linear alternate infinite;
                    animation-delay: 0s;
                }

                .icons::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 2px;
                    height: 2px;
                    border-radius: 50%;
                    opacity: 1;
                    box-shadow: 140px 20px #fff, 425px 20px #fff, 70px 120px #fff, 20px 130px #fff,
                        110px 80px #fff, 280px 80px #fff, 250px 350px #fff, 280px 230px #fff,
                        220px 190px #fff, 450px 100px #fff, 380px 80px #fff, 520px 50px #fff;
                    z-index: -1;
                    transition: 1.5s ease;
                    animation: 1s glowing-stars linear alternate infinite;
                    animation-delay: 0.4s;
                }

                .icons::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 2px;
                    height: 2px;
                    border-radius: 50%;
                    opacity: 1;
                    box-shadow: 490px 330px #fff, 420px 300px #fff, 320px 280px #fff,
                        380px 350px #fff, 546px 170px #fff, 420px 180px #fff, 370px 150px #fff,
                        200px 250px #fff, 80px 20px #fff, 190px 50px #fff, 270px 20px #fff,
                        120px 230px #fff, 350px -1px #fff, 150px 369px #fff;
                    z-index: -1;
                    transition: 2s ease;
                    animation: 1s glowing-stars linear alternate infinite;
                    animation-delay: 0.8s;
                }

                .card:hover .heading::before,
                .card:hover .icons::before,
                .card:hover .icons::after {
                    filter: blur(3px);
                }

                .image:active {
                    cursor: -webkit-grabbing;
                    cursor: grabbing;
                }

                .image:active + .heading::before {
                    box-shadow: 240px 20px #9b40fc, 240px 25px #9b40fc, 240px 30px #9b40fc,
                        240px 35px #9b40fc, 240px 40px #9b40fc, 242px 45px #9b40fc,
                        246px 48px #9b40fc, 251px 49px #9b40fc, 256px 48px #9b40fc,
                        260px 45px #9b40fc, 262px 40px #9b40fc;
                    animation: none;
                    filter: blur(0);
                    border-radius: 2px;
                    width: 0.45em;
                    height: 0.45em;
                    scale: 0.65;
                    transform: translateX(9em) translateY(1em);
                }

                .image:active ~ .icons::before {
                    box-shadow: 262px 35px #9b40fc, 262px 30px #9b40fc, 262px 25px #9b40fc,
                        262px 20px #9b40fc, 275px 20px #9b40fc, 275px 24px #9b40fc,
                        275px 28px #9b40fc, 275px 32px #9b40fc, 275px 36px #9b40fc,
                        275px 40px #9b40fc, 275px 44px #9b40fc, 275px 48px #9b40fc;
                    animation: none;
                    filter: blur(0);
                    border-radius: 2px;
                    width: 0.45em;
                    height: 0.45em;
                    scale: 0.65;
                    transform: translateX(9em) translateY(1em);
                }

                .image:active ~ .icons::after {
                    box-shadow: 238px 60px #9b40fc, 242px 60px #9b40fc, 246px 60px #9b40fc,
                        250px 60px #9b40fc, 254px 60px #9b40fc, 258px 60px #9b40fc,
                        262px 60px #9b40fc, 266px 60px #9b40fc, 270px 60px #9b40fc,
                        274px 60px #9b40fc, 278px 60px #9b40fc, 282px 60px #9b40fc,
                        234px 60px #9b40fc, 234px 60px #9b40fc;
                    animation: none;
                    filter: blur(0);
                    border-radius: 2px;
                    width: 0.45em;
                    height: 0.45em;
                    scale: 0.65;
                    transform: translateX(9em) translateY(1.25em);
                }

                .heading::after {
                    content: "";
                    top: -100px;
                    left: -100px;
                    position: absolute;
                    width: 15em;
                    height: 15em;
                    border: none;
                    outline: none;
                    border-radius: 50%;
                    background: #f9f9fb;
                    box-shadow: 0px 0px 100px rgba(193, 119, 241, 0.8),
                        0px 0px 100px rgba(135, 42, 211, 0.8), inset #9b40fc 0px 0px 40px -12px;
                    transition: 0.4s ease-in-out;
                    z-index: -1;
                }

                .card:hover .heading::after {
                    box-shadow: 0px 0px 200px rgba(193, 119, 241, 1),
                        0px 0px 200px rgba(135, 42, 211, 1), inset #9b40fc 0px 0px 40px -12px;
                }

                .icons {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: row;
                    column-gap: 1em;
                    z-index: 1;
                }
                .heading[dir="rtl"] .icons {
                    justify-content: flex-end;
                }

                .instagram::before {
                    content: "";
                    position: absolute;
                    top: -700%;
                    left: 1050%;
                    rotate: -45deg;
                    width: 5em;
                    height: 1px;
                    background: linear-gradient(90deg, #ffffff, transparent);
                    animation: 4s shootingStar ease-in-out infinite;
                    transition: 1s ease;
                    animation-delay: 1s;
                }

                .x::before {
                    content: "";
                    position: absolute;
                    top: -1300%;
                    left: 850%;
                    rotate: -45deg;
                    width: 5em;
                    height: 1px;
                    background: linear-gradient(90deg, #ffffff, transparent);
                    animation: 4s shootingStar ease-in-out infinite;
                    animation-delay: 3s;
                }

                .discord::before {
                    content: "";
                    position: absolute;
                    top: -2100%;
                    left: 850%;
                    rotate: -45deg;
                    width: 5em;
                    height: 1px;
                    background: linear-gradient(90deg, #ffffff, transparent);
                    animation: 4s shootingStar ease-in-out infinite;
                    animation-delay: 5s;
                }

                .card:hover .instagram::before,
                .card:hover .x::before,
                .card:hover .discord::before {
                    filter: blur(3px);
                }

                .image:active ~ .icons .instagram::before,
                .image:active ~ .icons .x::before,
                .image:active ~ .icons .discord::before {
                    animation: none;
                    opacity: 0;
                }

                @keyframes shootingStar {
                    0% { transform: translateX(0) translateY(0); opacity: 1; }
                    50% { transform: translateX(-55em) translateY(0); opacity: 1; }
                    70% { transform: translateX(-70em) translateY(0); opacity: 0; }
                    100% { transform: translateX(0) translateY(0); opacity: 0; }
                }

                @keyframes move {
                    0% { transform: translateX(0em) translateY(0em); }
                    25% { transform: translateY(-1em) translateX(-1em); rotate: -10deg; }
                    50% { transform: translateY(1em) translateX(-1em); }
                    75% { transform: translateY(-1.25em) translateX(1em); rotate: 10deg; }
                    100% { transform: translateX(0em) translateY(0em); }
                }

                @keyframes glowing-stars {
                    0% { opacity: 0; }
                    50% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>
        </div>
    )
}
