import { prisma } from '@/lib/db'

type NotificationPayload = {
    title: string
    message: string
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
    link?: string | null
}

/**
 * Create the same notification for all active Admin users.
 * Use excludeUserIds to avoid duplicating for users already notified (e.g. assigned agent who is Admin).
 */
export async function alsoNotifyAdmins(
    data: NotificationPayload,
    excludeUserIds: string[] = []
): Promise<void> {
    try {
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN', isActive: true },
            select: { id: true },
        })
        const exclude = new Set(excludeUserIds)
        const toNotify = admins.filter((a) => !exclude.has(a.id))
        if (toNotify.length === 0) return
        await Promise.all(
            toNotify.map((u) =>
                prisma.notification.create({
                    data: {
                        userId: u.id,
                        title: data.title,
                        message: data.message,
                        type: (data.type ?? 'INFO') as any,
                        link: data.link ?? null,
                    },
                })
            )
        )
    } catch {
        /* non-blocking */
    }
}

export type EntityTypeForNotify = 'offer' | 'template' | 'bot_flow'

const entityTypeLabels: Record<EntityTypeForNotify, string> = {
    offer: 'عرض',
    template: 'قالب',
    bot_flow: 'سير',
}

/**
 * When an Agent or Supervisor creates an offer, template, or bot flow:
 * - Notify all Admins that "X created [entity] Y".
 * - If creator is an Agent, also notify Supervisors who manage the agent's branch(es).
 */
export async function notifyOnEntityCreate(params: {
    creatorId: string
    creatorBranchIds: string[]
    entityType: EntityTypeForNotify
    entityName: string
    entityId: string
}): Promise<void> {
    try {
        const creator = await prisma.user.findUnique({
            where: { id: params.creatorId },
            select: { name: true, role: true },
        })
        if (!creator) return

        const label = entityTypeLabels[params.entityType]
        const title = label
        const message = `${creator.name} أنشأ ${label}: ${params.entityName}`
        const link = params.entityType === 'offer' ? '/offers' : params.entityType === 'template' ? '/templates' : '/bot-flows'

        // Notify all Admins (except creator if they are Admin)
        await alsoNotifyAdmins({ title, message, type: 'SUCCESS', link }, [params.creatorId])

        // If creator is Agent, notify Supervisors who manage the agent's branch(es)
        if (creator.role === 'AGENT' && params.creatorBranchIds.length > 0) {
            const supervisors = await prisma.user.findMany({
                where: {
                    role: 'SUPERVISOR',
                    isActive: true,
                    id: { not: params.creatorId },
                    branches: {
                        some: { id: { in: params.creatorBranchIds } },
                    },
                },
                select: { id: true },
            })
            if (supervisors.length > 0) {
                await Promise.all(
                    supervisors.map((u) =>
                        prisma.notification.create({
                            data: {
                                userId: u.id,
                                title,
                                message,
                                type: 'SUCCESS',
                                link,
                            },
                        })
                    )
                )
            }
        }
    } catch {
        /* non-blocking */
    }
}
