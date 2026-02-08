"use client"

import type React from "react"
import { NavigationRail } from "./navigation-rail"
import { TopBar } from "./top-bar"

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  showSearch?: boolean
}

export function AppLayout({ children, title, showSearch = false }: AppLayoutProps) {
  return (
    /* dir يُورث من document (يضبطه I18nProvider + السكربت في layout) لتفادي وميض LTR */
    <div className="flex h-screen overflow-hidden bg-background flex-row">
      <NavigationRail />

      {/* Main Content Area - المحتوى يورث الاتجاه ويبدأ من اليمين في RTL */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 text-start">
        <TopBar title={title} showSearch={showSearch} />

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1400px] p-8 text-start">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
