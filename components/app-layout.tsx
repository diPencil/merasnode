"use client"

import type React from "react"
import { useEffect } from "react"
import { NavigationRail } from "./navigation-rail"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { TopBar } from "./top-bar"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  showSearch?: boolean
}

export function AppLayout({ children, title, showSearch = false }: AppLayoutProps) {
  const isMobile = useIsMobile()

  // iOS-safe viewport height: keep --app-vh in sync with real innerHeight.
  // Only needed on mobile; desktop uses regular 100vh.
  useEffect(() => {
    if (!isMobile) return

    const setAppVh = () => {
      if (typeof window === "undefined") return
      const vh = window.innerHeight
      document.documentElement.style.setProperty("--app-vh", `${vh}px`)
    }

    setAppVh()
    window.addEventListener("resize", setAppVh)
    window.addEventListener("orientationchange", setAppVh)
    return () => {
      window.removeEventListener("resize", setAppVh)
      window.removeEventListener("orientationchange", setAppVh)
    }
  }, [isMobile])

  return (
    <div className="app-shell flex overflow-hidden bg-background flex-col md:flex-row">
      {/* Desktop sidebar – sealed scroll boundary: overflow-hidden + h-full
           ensures sidebar never participates in page scroll */}
      <div className="hidden md:flex shrink-0 h-full overflow-hidden">
        <NavigationRail />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 text-start">
        <TopBar title={title} showSearch={showSearch} isMobile={isMobile} />

        <main className="flex-1 overflow-auto overscroll-contain">
          <div
            className={cn(
              "mx-auto w-full max-w-[1400px] text-start",
              "p-4 sm:p-6 md:p-6 lg:p-8",
              // Mobile: extra bottom padding for bottom nav + safe area
              // Desktop: normal padding
              "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-6 lg:pb-8"
            )}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  )
}
