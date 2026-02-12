import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const WHATSAPP_SERVICE_URL = 'http://localhost:3001'

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
        const chatsResponse = await fetch(`${WHATSAPP_SERVICE_URL}/chats/${accountId}`)

        if (!chatsResponse.ok) {
            throw new Error('Failed to fetch chats from WhatsApp service')
        }

        const chatsData = await chatsResponse.json()
        const chats = chatsData.chats || []

        console.log(`📱 Found ${chats.length} chats`)

        let syncedContacts = 0
        let syncedConversations = 0

        // Process each chat
        for (const chat of chats) {
            try {
                // Extract phone number or group ID
                let contactPhone = ""
                if (chat.id.includes('@g.us')) {
                    contactPhone = chat.id // Use full JID for groups
                } else {
                    const phoneMatch = chat.id.match(/^(\d+)@/)
                    contactPhone = phoneMatch ? phoneMatch[1] : ""
                }

                if (!contactPhone) {
                    console.log(`⏭️ Skipping invalid chat: ${chat.name || chat.id}`)
                    continue
                }

                // Create or update contact and attach to branch (if account has branch)
                let contact = await prisma.contact.findUnique({
                    where: { phone: contactPhone }
                })

                if (!contact) {
                    contact = await prisma.contact.create({
                        data: {
                            phone: contactPhone,
                            name: chat.name || contactPhone,
                            ...(branchId && { branchId }),
                        }
                    })
                } else {
                    const contactUpdateData: any = {
                        name: chat.name || contact.name || contactPhone,
                        updatedAt: new Date()
                    }

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
                            // Auto-assign to agent linked with this WhatsApp account, if available
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

                    // If conversation is unassigned, auto-assign to agent linked with this account
                    if (!existingConversation.assignedToId && assignedAgentId) {
                        conversationUpdateData.assignedToId = assignedAgentId
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
