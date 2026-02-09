"use client"
import { SidebarContent } from "./sidebar-content"

interface SidebarProps {
    conversation: any
    onUpdate: () => void
}

export function Sidebar({ conversation, onUpdate }: SidebarProps) {
    if (!conversation) return null

    return (
        <div className="w-[320px] bg-card border-s flex-col overflow-y-auto hidden xl:flex h-full">
            <SidebarContent conversation={conversation} onUpdate={onUpdate} />
        </div>
    )
}
