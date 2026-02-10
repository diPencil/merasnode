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
  /**
   * When true, children fill the entire main area with no padding or
   * max-width wrapper. The main element uses overflow-hidden so the page
   * manages its own internal scroll (e.g. inbox chat layout).
   */
  fullBleed?: boolean
}

export function AppLayout({
  children,
  title,
  showSearch = false,
  fullBleed = false,
}: AppLayoutProps) {
  const isMobile = useIsMobile()

  // iOS-safe viewport height: keep --app-vh in sync with real innerHeight.
  // Uses visualViewport API for accurate keyboard-aware height on iOS/Android.
  useEffect(() => {
    if (!isMobile) return

    const setAppVh = () => {
      if (typeof window === "undefined") return
      // visualViewport gives accurate height when keyboard is open
      const vh = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty("--app-vh", `${vh}px`)
    }

    setAppVh()

    // Listen to visualViewport resize (keyboard open/close) if available
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
    <div className="app-shell flex overflow-hidden bg-background flex-col md:flex-row">
      {/* ─── Desktop sidebar ───
          Sealed scroll boundary: shrink-0 + h-full + overflow-hidden ensures
          the sidebar never participates in page scroll.
          CSS containment is applied via .app-shell > *:first-child rule. */}
      <div className="hidden md:flex shrink-0 h-full overflow-hidden">
        <NavigationRail />
      </div>

      {/* ─── Main content column ─── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 text-start">
        <TopBar title={title} showSearch={showSearch} isMobile={isMobile} />

        <main
          className={cn(
            "flex-1 min-h-0",
            fullBleed
              ? "overflow-hidden"           /* page manages its own scroll */
              : "overflow-auto overscroll-contain" /* normal scroll pages */
          )}
        >
          {fullBleed ? (
            children
          ) : (
            <div
              className={cn(
                "mx-auto w-full max-w-[1400px] text-start",
                "p-4 sm:p-6 md:p-6 lg:p-8",
                /* Mobile: extra bottom padding for bottom nav + safe area
                   Desktop: normal padding */
                "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-6 lg:pb-8"
              )}
            >
              {children}
            </div>
          )}
        </main>
      </div>

      {/* ─── Mobile bottom navigation ─── */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  )
}
