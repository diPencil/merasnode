import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST - Receive incoming WhatsApp message from service
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        console.log('📥 Webhook received payload:', body);
        const { from, body: messageBody, timestamp, isGroup, senderName, accountId } = body

        // Ignore status broadcasts
        if (from === 'status@broadcast') {
            return NextResponse.json({ success: true, message: 'Status broadcast ignored' })
        }

        // Format phone number (remove @ suffix if exists)
        const phoneNumber = from.split('@')[0]

        // Find or create contact
        let contact = await prisma.contact.findUnique({
            where: { phone: phoneNumber }
        })

        if (!contact) {
            // Create new contact
            contact = await prisma.contact.create({
                data: {
                    name: senderName || phoneNumber, // Use real name or group name
                    phone: phoneNumber,
                    tags: isGroup ? ["whatsapp-group"] : ["whatsapp-contact"]
                }
            })
        } else if (senderName && contact.name !== senderName) {
            // Always update name if we have a better one and it's different
            console.log(`🔄 Updating contact name from '${contact.name}' to '${senderName}'`)
            contact = await prisma.contact.update({
                where: { id: contact.id },
                data: { name: senderName }
            })
        }

        // Find MOST RECENT conversation for this contact (resolved or not)
        let conversation = await prisma.conversation.findFirst({
            where: {
                contactId: contact.id,
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        if (!conversation) {
            // Create new conversation
            console.log('🆕 Creating NEW conversation');
            conversation = await prisma.conversation.create({
                data: {
                    contactId: contact.id,
                    status: 'ACTIVE',
                    isRead: false
                }
            })
        } else {
            // If exists, ensure it's ACTIVE
            if (conversation.status === 'RESOLVED') {
                console.log(`♻️ Reactivating RESOLVED conversation ${conversation.id}`);
                conversation = await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: { status: 'ACTIVE' }
                });
            }
        }

        // Create message
        const message = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: messageBody,
                type: 'TEXT',
                direction: 'INCOMING',
                status: 'DELIVERED',
                whatsappAccountId: accountId || null  // Track which account received this
            }
        })

        // Update conversation last message time
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                lastMessageAt: new Date(),
                isRead: false
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Message saved successfully',
            data: {
                contactId: contact.id,
                conversationId: conversation.id,
                messageId: message.id
            }
        })
    } catch (error: any) {
        console.error('Error processing incoming message:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to process message' },
            { status: 500 }
        )
    }
}
