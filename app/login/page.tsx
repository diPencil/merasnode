"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { login } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { t } = useI18n()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)

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
        } catch (error) {
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
        <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-primary/5 via-background to-primary/10 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <svg
                            className="h-10 w-10 text-primary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>
                    <CardTitle className="text-2xl font-bold">{t("merasCrm")}</CardTitle>
                    <CardDescription>{t("signInToAccount")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{t("emailOrUsernameLabel")}</Label>
                            <Input
                                id="email"
                                type="text"
                                autoComplete="username"
                                placeholder={t("placeholderEmailOrUsername")}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t("passwordLabel")}</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder={t("placeholderPassword")}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-11"
                            />
                        </div>
                        <Button type="submit" className="w-full h-11" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                    {t("signingIn")}
                                </>
                            ) : (
                                t("signIn")
                            )}
                        </Button>
                    </form>
                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        <p className="mb-2">{t("defaultCredentials")}</p>
                        <div className="flex items-center justify-center gap-2">
                            <p className="font-mono text-xs">
                                admin@meras.com or admin / admin123
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setEmail("admin@meras.com")
                                    setPassword("admin123")
                                }}
                                className="h-7 text-xs"
                            >
                                {t("autoFill")}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
