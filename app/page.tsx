"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push("/dashboard")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-sky-50 via-blue-50 to-indigo-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
        <p className="mt-4 text-sm text-slate-600">Loading...</p>
      </div>
    </div>
  )
}
