"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { useI18n } from "@/lib/i18n"
import { authenticatedFetch } from "@/lib/auth"
import { MessageSquare, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ConversationUser {
  id: string
  name: string
  email: string
  status: "ONLINE" | "OFFLINE" | "AWAY"
  role: string
}

export default function InternalChatPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [users, setUsers] = useState<ConversationUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    authenticatedFetch("/api/internal-chat/conversations")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) setUsers(data.data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return (
    <AppLayout title={t("internalChat")}>
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("internalChat")}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t("internalChatConversations")}</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("loading")}</p>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t("noInternalConversations")}</p>
              <button
                type="button"
                className="mt-4 text-primary hover:underline"
                onClick={() => router.push("/users")}
              >
                {t("users")}
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => (
              <Card
                key={u.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/users/${u.id}/internal-chat`)}
              >
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{u.name}</CardTitle>
                    <CardDescription className="truncate">{u.email}</CardDescription>
                  </div>
                  <Badge
                    variant={u.status === "ONLINE" ? "default" : u.status === "AWAY" ? "secondary" : "outline"}
                    className="shrink-0"
                  >
                    {u.status}
                  </Badge>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
