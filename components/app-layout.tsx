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
  /** When true, children fill the main area with no padding; main uses overflow-hidden so the page manages its own scroll (e.g. inbox). */
  fullBleed?: boolean
}

export function AppLayout({
  children,
  title,
  showSearch = false,
  fullBleed = false,
}: AppLayoutProps) {
  const isMobile = useIsMobile()

  // iOS-safe viewport: keep --app-vh in sync with visualViewport for keyboard-aware height on mobile.
  useEffect(() => {
    if (!isMobile) return
    const setAppVh = () => {
      if (typeof window === "undefined") return
      const vh = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty("--app-vh", `${vh}px`)
    }
    setAppVh()
    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener("resize", setAppVh)
      vv.addEventListener("scroll", setAppVh)
    }
    window.addEventListener("resize", setAppVh)
    window.addEventListener("orientationchange", setAppVh)
    return () => {
      if (vv) {
        vv.removeEventListener("resize", setAppVh)
        vv.removeEventListener("scroll", setAppVh)
      }
      window.removeEventListener("resize", setAppVh)
      window.removeEventListener("orientationchange", setAppVh)
    }
  }, [isMobile])

  return (
    <div className="app-shell flex h-full min-h-0 overflow-hidden bg-background flex-col md:flex-row">
      {/* Desktop sidebar: fixed width, no scroll; only inner nav scrolls */}
      <div className="hidden md:flex shrink-0 h-full overflow-hidden">
        <NavigationRail />
      </div>

      {/* Main content column: scroll only here, never body */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 min-h-0 text-start">
        <TopBar title={title} showSearch={showSearch} isMobile={isMobile} />

        <main
          className={cn(
            "flex-1 min-h-0",
            fullBleed
              ? "overflow-hidden"
              : "overflow-auto overscroll-contain"
          )}
        >
          {fullBleed ? (
            children
          ) : (
            <div
              className={cn(
                "mx-auto w-full max-w-[1400px] text-start",
                "p-4 sm:p-6 md:p-6 lg:p-8",
                "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-6 lg:pb-8"
              )}
            >
              {children}
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden shrink-0">
        <MobileBottomNav />
      </div>
    </div>
  )
}

