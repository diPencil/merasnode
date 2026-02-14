import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'

/**
 * POST /api/whatsapp/sync
 * Sync WhatsApp chats and contacts to database
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { accountId } = body

        if (!accountId) {
            return NextResponse.json(
                { success: false, error: 'accountId is required' },
                { status: 400 }
            )
        }

        // Check if account exists
        const account = await prisma.whatsAppAccount.findUnique({
            where: { id: accountId },
            select: {
                id: true,
                branchId: true,
                users: {
                    select: {
                        id: true,
                        role: true,
                        isActive: true,
                    },
                },
            },
        })

        if (!account) {
            return NextResponse.json(
                { success: false, error: 'Account not found' },
                { status: 404 }
            )
        }

        console.log(`🔄 Starting sync for account ${accountId}...`)

        // Resolve branch + default assigned agent from WhatsApp account
        const branchId = account.branchId || null
        const activeAgent = account.users.find(
            (u) => u.role === 'AGENT' && u.isActive
        )
        const assignedAgentId = activeAgent ? activeAgent.id : null

        // Get chats from WhatsApp service
        let chatsResponse: Response
        try {
            chatsResponse = await fetch(`${WHATSAPP_SERVICE_URL}/chats/${accountId}`, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(30000), // 30s timeout
            })
        } catch (fetchError: any) {
            const msg = fetchError?.name === 'AbortError'
                ? 'WhatsApp service did not respond in time (timeout).'
                : fetchError?.message || 'Could not reach WhatsApp service.'
            console.error('Sync fetch error:', fetchError)
            throw new Error(`Failed to fetch chats: ${msg} Is the service running at ${WHATSAPP_SERVICE_URL}?`)
        }

        const responseText = await chatsResponse.text()
        let chatsData: { chats?: any[] }
        try {
            chatsData = responseText ? JSON.parse(responseText) : {}
        } catch {
            throw new Error(`Invalid response from WhatsApp service (status ${chatsResponse.status}). Check that the service exposes GET /chats/:accountId.`)
        }

        if (!chatsResponse.ok) {
            const errMsg = (chatsData as any)?.error || (chatsData as any)?.message || responseText?.slice(0, 200) || `HTTP ${chatsResponse.status}`
            throw new Error(`WhatsApp service error: ${errMsg}`)
        }

        const chats = chatsData.chats || []

        console.log(`📱 Found ${chats.length} chats`)

        let syncedContacts = 0
        let syncedConversations = 0

        // Process each chat
        for (const chat of chats) {
            try {
                // Extract phone number or group ID
                let contactPhone = ""
                let isGroup = chat.isGroup || chat.id.includes('@g.us');

                if (isGroup) {
                    contactPhone = chat.id; // Use full serialized JID for groups
                } else {
                    const phoneMatch = chat.id.match(/^(\d+)@/);
                    contactPhone = phoneMatch ? phoneMatch[1] : "";
                }

                if (!contactPhone) {
                    console.log(`⏭️ Skipping invalid chat: ${chat.name || chat.id}`);
                    continue;
                }

                // Create or update contact and attach to branch
                let contact = await prisma.contact.findUnique({
                    where: { phone: contactPhone }
                });

                // للمجموعات: إن وُجدت جهة اتصال بنفس الرقم بدون @g.us نحدّثها للصيغة الكاملة لتجنب التكرار
                if (!contact && isGroup && contactPhone.endsWith('@g.us')) {
                    const withoutSuffix = contactPhone.replace('@g.us', '')
                    contact = await prisma.contact.findFirst({
                        where: { phone: withoutSuffix }
                    })
                    if (contact) {
                        contact = await prisma.contact.update({
                            where: { id: contact.id },
                            data: { phone: contactPhone, name: chat.name || contact.name || contactPhone }
                        })
                    }
                }

                if (!contact) {
                    contact = await prisma.contact.create({
                        data: {
                            phone: contactPhone,
                            name: chat.name || contactPhone,
                            tags: isGroup ? ['group'] : ['whatsapp-contact'],
                            ...(branchId && { branchId }),
                        }
                    });
                } else {
                    const currentTags = contact.tags ? (Array.isArray(contact.tags) ? [...contact.tags] : String(contact.tags).split(',')) : [];
                    const tagToAdd = isGroup ? 'group' : 'whatsapp-contact';
                    if (!currentTags.includes(tagToAdd)) {
                        currentTags.push(tagToAdd);
                    }

                    const contactUpdateData: any = {
                        name: chat.name || contact.name || contactPhone,
                        updatedAt: new Date(),
                        tags: currentTags
                    };

                    // If contact has no branch yet, inherit from WhatsApp account
                    if (!contact.branchId && branchId) {
                        contactUpdateData.branchId = branchId
                    }

                    contact = await prisma.contact.update({
                        where: { id: contact.id },
                        data: contactUpdateData
                    })
                }

                syncedContacts++

                // Create or update conversation (only if doesn't exist)
                const existingConversation = await prisma.conversation.findFirst({
                    where: { contactId: contact.id }
                })

                if (!existingConversation) {
                    await prisma.conversation.create({
                        data: {
                            contactId: contact.id,
                            status: 'ACTIVE',
                            lastMessageAt: new Date(chat.timestamp * 1000),
                            isRead: chat.unreadCount === 0,
                            whatsappAccountId: accountId,
                            ...(assignedAgentId && { assignedToId: assignedAgentId })
                        }
                    })
                    syncedConversations++
                } else {
                    // Update existing conversation
                    const conversationUpdateData: any = {
                        lastMessageAt: new Date(chat.timestamp * 1000),
                        isRead: chat.unreadCount === 0,
                        updatedAt: new Date()
                    }

                    if (!existingConversation.assignedToId && assignedAgentId) {
                        conversationUpdateData.assignedToId = assignedAgentId
                    }
                    if (!existingConversation.whatsappAccountId) {
                        conversationUpdateData.whatsappAccountId = accountId
                    }

                    await prisma.conversation.update({
                        where: { id: existingConversation.id },
                        data: conversationUpdateData
                    })
                    syncedConversations++
                }

                console.log(`✅ Synced: ${chat.name} (${contactPhone})`)
            } catch (error) {
                console.error(`❌ Error syncing chat ${chat.name}:`, error)
            }
        }

        console.log(`✅ Sync complete: ${syncedContacts} contacts, ${syncedConversations} conversations`)

        return NextResponse.json({
            success: true,
            message: 'Sync completed',
            synced: {
                contacts: syncedContacts,
                conversations: syncedConversations,
                total: chats.length
            }
        })
    } catch (error: any) {
        console.error('Error syncing WhatsApp data:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to sync WhatsApp data' },
            { status: 500 }
        )
    }
}
