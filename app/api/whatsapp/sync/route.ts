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
            where: { id: accountId }
        })

        if (!account) {
            return NextResponse.json(
                { success: false, error: 'Account not found' },
                { status: 404 }
            )
        }

        console.log(`🔄 Starting sync for account ${accountId}...`)

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
                // Extract phone number from chat ID
                const phoneMatch = chat.id.match(/^(\d+)@/)
                const phoneNumber = phoneMatch ? phoneMatch[1] : null

                // Skip groups for now (they don't have direct phone numbers)
                if (chat.isGroup || !phoneNumber) {
                    console.log(`⏭️ Skipping group or invalid chat: ${chat.name}`)
                    continue
                }

                // Create or update contact
                const contact = await prisma.contact.upsert({
                    where: { phone: phoneNumber },
                    update: {
                        name: chat.name || phoneNumber,
                        updatedAt: new Date()
                    },
                    create: {
                        phone: phoneNumber,
                        name: chat.name || phoneNumber
                    }
                })

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
                            isRead: chat.unreadCount === 0
                        }
                    })
                    syncedConversations++
                } else {
                    // Update existing conversation
                    await prisma.conversation.update({
                        where: { id: existingConversation.id },
                        data: {
                            lastMessageAt: new Date(chat.timestamp * 1000),
                            isRead: chat.unreadCount === 0,
                            updatedAt: new Date()
                        }
                    })
                    syncedConversations++
                }

                console.log(`✅ Synced: ${chat.name} (${phoneNumber})`)
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
