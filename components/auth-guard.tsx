"use client"

import { useEffect, useState, useLayoutEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"

// Routes that don't require authentication
const publicRoutes = ['/login']

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(true)

    // Use layoutEffect for faster initial check (runs before paint)
    useLayoutEffect(() => {
        // Check if current route is public
        const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
        const authenticated = isAuthenticated()

        // If not authenticated and trying to access protected route
        if (!authenticated && !isPublicRoute) {
            router.push('/login')
            return
        }

        // If authenticated and trying to access login page
        if (authenticated && pathname === '/login') {
            router.push('/dashboard')
            return
        }

        // All checks passed, show content immediately
        setIsLoading(false)
    }, [pathname, router])

    // Optimized loading state - minimal delay
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
