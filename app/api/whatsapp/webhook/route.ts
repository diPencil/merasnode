import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST - Receive incoming WhatsApp message from service
// Auto-assign branch + agent based on WhatsApp account mapping
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        console.log('📥 Webhook received payload:', body);
        const { from, timestamp, isGroup, senderName, accountId } = body
        let messageBody = body.body;


        // Ignore status broadcasts
        if (from === 'status@broadcast') {
            return NextResponse.json({ success: true, message: 'Status broadcast ignored' })
        }

        // Format identifier (keep full JID for groups, strip for private)
        let identifier = from
        if (!isGroup && from.includes('@')) {
            identifier = from.split('@')[0]
        }
        let phoneNumber = identifier
        let externalId: string | null = null

        // If it's a Meta ID (LID / Facebook ID)
        if (identifier.length > 15) {
            externalId = identifier
        }

        // Resolve branch + assigned agent from WhatsApp account so we can scope conversation correctly
        let branchId: string | null = null
        let assignedAgentId: string | null = null
        if (accountId) {
            const waAccount = await prisma.whatsAppAccount.findUnique({
                where: { id: accountId },
                select: {
                    branchId: true,
                    users: {
                        select: { id: true, role: true, isActive: true },
                    },
                },
            })
            if (waAccount?.branchId) branchId = waAccount.branchId

            // Pick the first active AGENT linked to this WhatsApp account (auto-assignment)
            const activeAgent = waAccount?.users.find(
                (u) => u.role === 'AGENT' && u.isActive,
            )
            if (activeAgent) assignedAgentId = activeAgent.id
        }

        // 1. Try to find contact by externalId or phone
        // Fix: Search for both formats (with/without @g.us) to prevent duplicates
        const searchPhones = [identifier];
        if (isGroup && identifier.includes('@g.us')) {
            searchPhones.push(identifier.replace('@g.us', ''));
        }

        let contact = await prisma.contact.findFirst({
            where: {
                OR: [
                    { externalId: identifier },
                    { phone: { in: searchPhones } }
                ]
            },
            orderBy: { createdAt: 'asc' } // Prefer oldest (original) contact if multiple exist
        })

        if (!contact) {
            // Create new contact (with branch when known)
            contact = await prisma.contact.create({
                data: {
                    name: senderName || phoneNumber,
                    phone: phoneNumber,
                    externalId: externalId,
                    tags: isGroup ? ["whatsapp-group"] : ["whatsapp-contact"],
                    ...(branchId && { branchId }),
                }
            })
        } else {
            // Update existing contact: set branch from WA account when we have one and contact has none
            if (branchId && !contact.branchId) {
                contact = await prisma.contact.update({
                    where: { id: contact.id },
                    data: { branchId },
                })
            }
        }

        if (contact && externalId && !contact.externalId) {
            contact = await prisma.contact.update({
                where: { id: contact.id },
                data: { externalId },
            })
        }
        if (contact && senderName && contact.name !== senderName) {
            console.log(`🔄 Updating contact name from '${contact.name}' to '${senderName}'`)
            contact = await prisma.contact.update({
                where: { id: contact.id },
                data: { name: senderName },
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
            // Create new conversation with auto-assigned agent when available
            console.log('🆕 Creating NEW conversation');
            conversation = await prisma.conversation.create({
                data: {
                    contactId: contact.id,
                    status: 'ACTIVE',
                    isRead: false,
                    ...(assignedAgentId && { assignedToId: assignedAgentId }),
                }
            })
        } else {
            // If exists, ensure it's ACTIVE and auto-assign agent if not already assigned
            const updateData: any = {}
            if (conversation.status === 'RESOLVED') {
                console.log(`♻️ Reactivating RESOLVED conversation ${conversation.id}`);
                updateData.status = 'ACTIVE'
            }
            if (!conversation.assignedToId && assignedAgentId) {
                updateData.assignedToId = assignedAgentId
            }
            if (Object.keys(updateData).length > 0) {
                conversation = await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: updateData,
                });
            }
        }

        // Create message
        let mediaUrl = null
        let messageType = 'TEXT'

        if (body.hasMedia && body.media) {
            try {
                // Save media to public uploads
                const fs = require('fs')
                const path = require('path')
                const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'whatsapp')

                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true })
                }

                // Clean extension handling
                let extension = body.media.mimetype.split('/')[1].split(';')[0]
                if (extension === 'ogg') extension = 'ogg'

                const filename = `${Date.now()}-${body.media.filename || 'media'}.${extension}`
                const filepath = path.join(uploadDir, filename)

                fs.writeFileSync(filepath, Buffer.from(body.media.data, 'base64'))
                mediaUrl = `/uploads/whatsapp/${filename}`

                // Determine messageType (Must match UI)
                if (body.type === 'ptt' || body.type === 'audio') messageType = 'AUDIO'
                else if (body.type === 'image') messageType = 'IMAGE'
                else if (body.type === 'video') messageType = 'VIDEO'
                else if (body.type === 'document') messageType = 'DOCUMENT'
                else messageType = 'DOCUMENT' // Fallback
            } catch (err) {
                console.error('❌ Error saving media file:', err)
            }
        }

        if (body.type === 'location' && body.location) {
            messageType = 'LOCATION'
            const { latitude, longitude } = body.location
            messageBody = `https://www.google.com/maps?q=${latitude},${longitude}`
        }

        const message = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: messageBody || (messageType !== 'TEXT' ? `Attachment: ${messageType}` : ''),
                type: messageType as any,
                direction: 'INCOMING',
                status: 'DELIVERED',
                mediaUrl: mediaUrl,
                whatsappAccountId: accountId || null,
                metadata: {
                    mentions: body.mentions || [],
                    quotedMsg: body.quotedMsg || null
                }
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
