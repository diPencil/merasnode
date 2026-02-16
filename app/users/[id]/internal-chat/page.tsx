"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * Redirect /users/[id]/internal-chat to /internal-chat?with=id
 * so the main internal chat page (two-column layout) opens with this user selected.
 */
export default function UserInternalChatRedirect() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    if (id) router.replace(`/internal-chat?with=${encodeURIComponent(id)}`)
  }, [id, router])

  return null
}
