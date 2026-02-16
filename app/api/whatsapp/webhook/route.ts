import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { alsoNotifyAdmins } from '@/lib/notifications'

// POST - Receive incoming WhatsApp message from service
// Auto-assign branch + agent based on WhatsApp account mapping
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        console.log('📥 Webhook received payload:', body);
        const { from, to, timestamp, isGroup, senderName, accountId, fromMe } = body
        // Full message text: body + caption for media (no truncation)
        let messageBody = body.body != null ? String(body.body) : ''
        if (!messageBody && body.caption != null) messageBody = String(body.caption)

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

        // Outgoing messages (fromMe): already saved by POST /api/messages when user sent — skip to avoid duplicates
        if (fromMe) {
            return NextResponse.json({ success: true, message: 'Outgoing message already stored by send API' })
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

        // 2. Contact Resolution — match phone in any format (+20..., 20..., etc.)
        const digitsOnly = identifier.replace(/\D/g, '')
        const searchPhones: string[] = [identifier, digitsOnly, '+' + digitsOnly]
        if (digitsOnly !== identifier) searchPhones.push(identifier)
        if (isGroup && identifier.includes('@g.us')) {
            searchPhones.push(identifier.replace('@g.us', ''))
        }

        let contact = await prisma.contact.findFirst({
            where: {
                OR: [
                    { externalId: identifier },
                    { externalId: digitsOnly },
                    { phone: { in: searchPhones } }
                ]
            },
            orderBy: { createdAt: 'asc' }
        })
        // Fallback: match by digits-only phone (e.g. DB has "+20 10 05866349")
        if (!contact && digitsOnly.length >= 10) {
            const suffix = digitsOnly.slice(-9)
            const candidates = await prisma.contact.findMany({
                where: { phone: { not: null, contains: suffix } },
                take: 20,
                orderBy: { createdAt: 'asc' }
            })
            contact = candidates.find(
                (c) => (c.phone && c.phone.replace(/\D/g, '') === digitsOnly)
            ) ?? null
        }

        if (!contact) {
            // New Contact Creation — store phone in consistent format (+digits) for matching
            const normalizedPhone = digitsOnly ? '+' + digitsOnly : phoneNumber
            const initialName = (!fromMe && senderName) ? senderName : normalizedPhone

            contact = await prisma.contact.create({
                data: {
                    name: isGroup ? (senderName || normalizedPhone) : initialName,
                    phone: normalizedPhone,
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

        // 5. Create Message — store full content (no truncation)
        const finalContent = messageBody || (messageType !== 'TEXT' && body.caption != null ? String(body.caption) : messageType !== 'TEXT' ? `Attachment: ${messageType}` : '')
        const message = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: finalContent,
                type: messageType as any,
                direction: fromMe ? 'OUTGOING' : 'INCOMING',
                status: fromMe ? 'SENT' : 'DELIVERED',
                mediaUrl: mediaUrl,
                whatsappAccountId: accountId || null,
                metadata: {
                    mentions: Array.isArray(body.mentions) ? body.mentions : [],
                    quotedMsg: body.quotedMsg || null,
                    authorName: (body.authorName != null ? String(body.authorName).trim() : null) || null,
                    authorId: body.authorId || null,
                    waMessageId: body.waMessageId || null
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

        // Notify relevant user(s) for INCOMING messages only
        if (!fromMe) {
            try {
                const preview = finalContent ? (String(finalContent).slice(0, 60) + (finalContent.length > 60 ? '…' : '')) : '📎 Media'
                const title = 'WhatsApp'
                const messageText = `${contact.name}: ${preview}`
                const link = `/inbox?id=${conversation.id}`

                const conv = await prisma.conversation.findUnique({
                    where: { id: conversation.id },
                    select: { assignedToId: true },
                })

                const notifiedIds: string[] = []
                if (conv?.assignedToId) {
                    await prisma.notification.create({
                        data: { userId: conv.assignedToId, title, message: messageText, type: 'INFO', link },
                    })
                    notifiedIds.push(conv.assignedToId)
                } else if (accountId) {
                    const users = await prisma.whatsAppAccount.findUnique({
                        where: { id: accountId },
                        select: { users: { select: { id: true } } },
                    })
                    if (users?.users?.length) {
                        await Promise.all(
                            users.users.map((u) =>
                                prisma.notification.create({
                                    data: { userId: u.id, title, message: messageText, type: 'INFO', link },
                                })
                            )
                        )
                        notifiedIds.push(...users.users.map((u) => u.id))
                    }
                }
                await alsoNotifyAdmins({ title, message: messageText, type: 'INFO', link }, notifiedIds)
            } catch (_) {
                /* non-blocking */
            }
        }

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
