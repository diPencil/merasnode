import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { I18nProvider } from "@/lib/i18n"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthGuard } from "@/components/auth-guard"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Meras CRM - WhatsApp Customer Management",
  description: "Modern WhatsApp-based CRM for managing customer conversations and support",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/favicon.png",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Default SSR: Arabic RTL. I18nProvider syncs lang/dir on client when user switches language.
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head />
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          <I18nProvider>
            <div className="app-root">
              <AuthGuard>
                <div className="app-content flex-1 flex flex-col min-h-0 overflow-hidden">
                  {children}
                </div>
              </AuthGuard>
            </div>
            <Toaster />
          </I18nProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
