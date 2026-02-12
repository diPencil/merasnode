import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST - Receive incoming WhatsApp message from service
// Auto-assign branch + agent based on WhatsApp account mapping
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        console.log('📥 Webhook received payload:', body);
        const { from, to, timestamp, isGroup, senderName, accountId, fromMe } = body
        let messageBody = body.body;

        // Determine effective target identifier (Who is the Other Party?)
        // If Incoming: Contact is 'from'
        // If Outgoing (fromMe): Contact is 'to'
        // Format identifier (keep full JID for groups, strip for private)
        let identifier = fromMe && to ? to : from;

        if (!isGroup && identifier.includes('@')) {
            identifier = identifier.split('@')[0]
        }
        let phoneNumber = identifier

        // ... (Existing ignore logic for status broadcast)
        if (identifier === 'status' || identifier.includes('status@broadcast')) {
            return NextResponse.json({ success: true, message: 'Status broadcast ignored' })
        }

        // ... (Existing account logic)
        // ... (Skip lines 25-52 for brevity in replacement if possible, but for safety I will include relevant context or jump)

        /* ... Assuming redundant parts are skipped, focusing on contact resolution ... */

        // Fix: Use the Resolved identifier for contact lookup

        // ... (Existing Contact Lookup Logic using 'identifier') ...
        // I will replace the block from 'identifier' definition down to message creation to be safe.

        let externalId: string | null = null
        if (identifier.length > 15) {
            externalId = identifier
        }

        // ... (Keep account lookup logic same, but verify if I need to fetch it again) ...
        // To avoid complex multi-chunk replace, I will rewrite the core logic block.

        // 1. Account Scope Lookup
        let branchId: string | null = null
        let assignedAgentId: string | null = null
        if (accountId) {
            const waAccount = await prisma.whatsAppAccount.findUnique({
                where: { id: accountId },
                select: {
                    branchId: true,
                    users: { select: { id: true, role: true, isActive: true } },
                },
            })
            if (waAccount?.branchId) branchId = waAccount.branchId
            const activeAgent = waAccount?.users.find((u) => u.role === 'AGENT' && u.isActive)
            if (activeAgent) assignedAgentId = activeAgent.id
        }

        // 2. Contact Resolution
        // 2. Contact Resolution
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
            orderBy: { createdAt: 'asc' }
        })

        if (!contact) {
            // New Contact Creation
            // For outgoing (fromMe), senderName is ME, so don't use it for contact name. Use Phone.
            // For incoming, senderName is the Contact's name.
            const initialName = (!fromMe && senderName) ? senderName : phoneNumber;

            contact = await prisma.contact.create({
                data: {
                    name: isGroup ? (senderName || phoneNumber) : initialName,
                    phone: phoneNumber,
                    externalId: externalId,
                    tags: isGroup ? ["whatsapp-group"] : ["whatsapp-contact"],
                    ...(branchId && { branchId }),
                }
            })
        } else {
            // Update branch for existing contact if missing
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

        // Only update name from INCOMING messages to avoid overwriting with Agent/System name
        if (!fromMe && contact && senderName && contact.name !== senderName) {
            console.log(`🔄 Updating contact name from '${contact.name}' to '${senderName}'`)
            contact = await prisma.contact.update({
                where: { id: contact.id },
                data: { name: senderName },
            })
        }

        // 3. Conversation Resolution
        let conversation = await prisma.conversation.findFirst({
            where: { contactId: contact.id, status: 'ACTIVE' }
        })

        if (!conversation) {
            // For outgoing sync, we might not want to create a NEW conversation if one doesn't exist? 
            // Usually yes, we do want to record it.
            conversation = await prisma.conversation.create({
                data: {
                    contactId: contact.id,
                    status: 'ACTIVE',
                    isRead: !!fromMe, // Mark read if we sent it
                    ...(assignedAgentId && { assignedToId: assignedAgentId }),
                }
            })
        } else {
            // For outgoing messages, we don't necessarily need to update the status to ACTIVE if it was RESOLVED,
            // but keeping it ACTIVE is safer for now.
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: { lastMessageAt: new Date(), isRead: !!fromMe }
            });
        }

        // 4. Media Handling
        let mediaUrl = null
        let messageType = 'TEXT'

        if (body.hasMedia && body.media) {
            try {
                const fs = require('fs')
                const path = require('path')
                // START OF CHANGE: Use public/uploads/whatsapp so it's accessible
                const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'whatsapp')
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true })
                }

                // Determine extension
                let extension = 'bin';
                if (body.media.mimetype) {
                    extension = body.media.mimetype.split('/')[1].split(';')[0]
                }
                if (extension === 'ogg') extension = 'mp3'; // Convert/Treat ogg as mp3 for compatibility/consistency if desired, or keep ogg

                const filename = `${Date.now()}-${(body.media.filename || 'media').replace(/[^a-z0-9.]/gi, '_')}.${extension}`
                const filepath = path.join(uploadDir, filename)

                fs.writeFileSync(filepath, Buffer.from(body.media.data, 'base64'))
                mediaUrl = `/uploads/whatsapp/${filename}`

                if (body.type === 'ptt' || body.type === 'audio') messageType = 'AUDIO'
                else if (body.type === 'image') messageType = 'IMAGE'
                else if (body.type === 'video') messageType = 'VIDEO'
                else if (body.type === 'document') messageType = 'DOCUMENT'
                else messageType = 'DOCUMENT'
            } catch (err) {
                console.error('❌ Error saving media file:', err)
            }
        }

        // Location handling
        if (body.type === 'location' && body.location) {
            messageType = 'LOCATION'
            const { latitude, longitude } = body.location
            messageBody = `https://www.google.com/maps?q=${latitude},${longitude}`
        }

        // 5. Create Message
        const message = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: messageBody || (messageType !== 'TEXT' ? (body.caption || `Attachment: ${messageType}`) : ''),
                type: messageType as any,
                direction: fromMe ? 'OUTGOING' : 'INCOMING',
                status: fromMe ? 'SENT' : 'DELIVERED',
                mediaUrl: mediaUrl,
                whatsappAccountId: accountId || null,
                metadata: {
                    mentions: body.mentions || [],
                    quotedMsg: body.quotedMsg || null
                }
            }
        })

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                lastMessageAt: new Date(),
                isRead: !!fromMe // If I sent it, it's read
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
