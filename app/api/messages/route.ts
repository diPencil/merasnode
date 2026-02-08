import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/logger"

// GET - جلب رسائل محادثة معينة
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const conversationId = searchParams.get('conversationId')

        if (!conversationId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Conversation ID is required"
                },
                { status: 400 }
            )
        }

        const messages = await prisma.message.findMany({
            where: { conversationId },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        return NextResponse.json({
            success: true,
            messages: messages,
            count: messages.length
        })
    } catch (error) {
        console.error('Error fetching messages:', error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch messages"
            },
            { status: 500 }
        )
    }
}

// POST - إرسال رسالة جديدة
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const { conversationId, phone, content, direction = 'OUTGOING', mediaUrl, whatsappAccountId } = body;

        if (!content) {
            return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
        }

        let targetConversationId = conversationId;
        let phoneNumber = "";
        let accountId = whatsappAccountId || body.accountId;

        // 1. Resolve Conversation and Phone Number
        if (targetConversationId) {
            const conversation = await prisma.conversation.findUnique({
                where: { id: targetConversationId },
                include: { contact: true }
            });

            if (!conversation) {
                return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 });
            }
            phoneNumber = conversation.contact.phone;
        } else if (phone) {
            // Support sending to a new phone directly
            phoneNumber = phone.replace(/[^0-9]/g, '');

            // Basic validation: Phone should be a reasonable length, not a massive ID
            if (phoneNumber.length < 8 || phoneNumber.length > 15) {
                return NextResponse.json({
                    success: false,
                    error: "Invalid phone number format. If this is a Facebook contact, you cannot send WhatsApp messages to it."
                }, { status: 400 });
            }

            // Find or create contact
            let contact = await prisma.contact.findUnique({ where: { phone: phoneNumber } });
            if (!contact) {
                contact = await prisma.contact.create({
                    data: { name: phoneNumber, phone: phoneNumber, tags: ["new-from-system"] }
                });
            }

            // Find or create active conversation
            let conversation = await prisma.conversation.findFirst({
                where: { contactId: contact.id, status: 'ACTIVE' },
                orderBy: { updatedAt: 'desc' }
            });

            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: { contactId: contact.id, status: 'ACTIVE' }
                });
            }
            targetConversationId = conversation.id;
        } else {
            return NextResponse.json({ success: false, error: "Either conversationId or phone is required" }, { status: 400 });
        }

        // 2. Send via WhatsApp Service (if OUTGOING)
        if (direction === 'OUTGOING') {
            if (process.env.NODE_ENV === 'development' || process.env.SKIP_WHATSAPP === 'true') {
                console.log('🔧 Development mode: Skipping WhatsApp send');
            } else {
                try {
                    // Extract clean phone for WA
                    const waPhone = phoneNumber.replace(/[^0-9]/g, '');

                    // Double check if it looks like a Facebook ID (very long string of digits)
                    if (waPhone.length > 15) {
                        throw new Error('This looks like a Facebook ID, not a WhatsApp phone number.');
                    }

                    if (!accountId) {
                        const connectedAccount = await prisma.whatsAppAccount.findFirst({
                            where: { status: 'CONNECTED' },
                            orderBy: { createdAt: 'desc' }
                        });
                        if (!connectedAccount) throw new Error('No connected WhatsApp account found');
                        accountId = connectedAccount.id;
                    }

                    const whatsappRes = await fetch('http://localhost:3001/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            accountId,
                            phoneNumber: waPhone,
                            message: content,
                            mediaUrl
                        })
                    });

                    const whatsappData = await whatsappRes.json();
                    if (!whatsappData.success) {
                        throw new Error(whatsappData.error || 'WhatsApp Service delivery failed');
                    }
                } catch (error: any) {
                    console.error('WhatsApp Send Error:', error);
                    return NextResponse.json({ success: false, error: error.message || 'Unknown WhatsApp Error' }, { status: 502 });
                }
            }
        }

        // 3. Save to Database (Create Message)
        // Determine message type based on mediaUrl
        let messageType = 'TEXT'
        if (body.mediaUrl) {
            const url = body.mediaUrl.toLowerCase()
            if (url.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
                messageType = 'IMAGE'
            } else if (url.match(/\.(mp4|mov|avi|webm)$/)) {
                messageType = 'VIDEO'
            } else if (url.match(/\.(mp3|wav|ogg|m4a)$/)) {
                messageType = 'AUDIO'
            } else {
                messageType = 'DOCUMENT'
            }
        }

        const message = await prisma.message.create({
            data: {
                conversationId: body.conversationId,
                content: body.content,
                type: messageType as any,
                direction: direction,
                status: 'SENT', // Initially SENT
                mediaUrl: body.mediaUrl || null,
                whatsappAccountId: accountId || null  // Track which account sent this
            }
        })

        // Log activity
        await logActivity({
            action: "CREATE",
            entityType: "Message",
            entityId: message.id,
            newValues: {
                conversationId: message.conversationId,
                direction: message.direction
            },
            description: `Sent ${message.direction} message`
        })

        // 4. Update conversation last message time
        await prisma.conversation.update({
            where: { id: body.conversationId },
            data: {
                lastMessageAt: new Date(),
                isRead: direction === 'OUTGOING' // Outgoing messages are implicitly read
            }
        })

        // Trigger bot flows for incoming messages
        if (direction === 'INCOMING') {
            try {
                // Get conversation and contact details
                const conversation = await prisma.conversation.findUnique({
                    where: { id: body.conversationId },
                    include: { contact: true }
                })

                if (conversation) {
                    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3003'}/api/bot-flows/execute`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            triggerType: 'new_message',
                            context: {
                                contactId: conversation.contactId,
                                contactName: conversation.contact.name,
                                contactPhone: conversation.contact.phone,
                                message: body.content,
                                conversationId: body.conversationId
                            }
                        })
                    })
                }
            } catch (triggerError) {
                console.error('Error triggering bot flows for message:', triggerError)
            }
        }

        return NextResponse.json({
            success: true,
            data: message
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating message:', error)

        if (error.code === 'P2003') {
            return NextResponse.json(
                {
                    success: false,
                    error: "Conversation not found"
                },
                { status: 404 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                error: "Failed to create message"
            },
            { status: 500 }
        )
    }
}
