"use client"

import type React from "react"
import { NavigationRail } from "./navigation-rail"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { TopBar } from "./top-bar"
import { useIsMobile } from "@/hooks/use-mobile"

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  showSearch?: boolean
}

export function AppLayout({ children, title, showSearch = false }: AppLayoutProps) {
  const isMobile = useIsMobile()

  return (
    <div className="flex h-dvh overflow-hidden bg-background flex-col md:flex-row">
      {/* Desktop: Side navigation rail - hidden on mobile via CSS */}
      <div className="hidden md:block shrink-0">
        <NavigationRail />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 text-start">
        <TopBar title={title} showSearch={showSearch} isMobile={isMobile} />

        <main className="flex-1 overflow-auto overscroll-contain">
          <div
            className={cn(
              "mx-auto w-full max-w-[1400px] text-start",
              "p-4 sm:p-6 md:p-8",
              "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-8"
            )}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Mobile: Bottom navigation - visible only on mobile via CSS */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
