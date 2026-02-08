"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUserRole } from "@/lib/auth"
import { canAccessPage, type PageRoute } from "@/lib/permissions"

interface PageGuardProps {
    children: React.ReactNode
    page: PageRoute
}

export function PageGuard({ children, page }: PageGuardProps) {
    const router = useRouter()

    useEffect(() => {
        const userRole = getUserRole()

        if (!userRole) {
            router.push('/login')
            return
        }

        if (!canAccessPage(userRole as any, page)) {
            // Redirect to dashboard if no access
            router.push('/dashboard')
        }
    }, [page, router])

    return <>{children}</>
}
