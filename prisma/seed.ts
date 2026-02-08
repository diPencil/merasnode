const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting seed...')

    // Delete existing data first
    console.log('🗑️  Cleaning up old data...')
    await prisma.message.deleteMany({})
    await prisma.conversation.deleteMany({})
    await prisma.template.deleteMany({})
    await prisma.whatsAppAccount.deleteMany({})
    await prisma.contact.deleteMany({})
    console.log('✅ Old data cleaned')

    // Create test contacts
    const contacts = await Promise.all([
        prisma.contact.create({
            data: {
                name: 'Ahmed Mohamed',
                phone: '+966501234567',
                email: 'ahmed@test.com',
                tags: 'customer,vip',
                notes: 'Test contact for chat testing'
            }
        }),
        prisma.contact.create({
            data: {
                name: 'Sara Ali',
                phone: '+966509876543',
                email: 'sara@test.com',
                tags: 'customer',
                notes: 'Test contact 2'
            }
        }),
        prisma.contact.create({
            data: {
                name: 'Mohamed Hassan',
                phone: '+966555444333',
                email: 'mohamed@test.com',
                tags: 'lead',
                notes: 'Test contact 3'
            }
        }),
        prisma.contact.create({
            data: {
                name: 'Fatima Khaled',
                phone: '+966557788999',
                email: 'fatima@test.com',
                tags: 'customer,active',
                notes: 'Test contact 4'
            }
        }),
        prisma.contact.create({
            data: {
                name: 'Omar Ibrahim',
                phone: '+966552233444',
                email: 'omar@test.com',
                tags: 'lead',
                notes: 'Test contact 5'
            }
        })
    ])

    console.log(`✅ Created ${contacts.length} test contacts`)

    // Create conversations with actual contact IDs
    const conversations = await Promise.all([
        prisma.conversation.create({
            data: {
                contactId: contacts[0].id,
                status: 'ACTIVE',
                lastMessageAt: new Date(),
                isRead: false
            }
        }),
        prisma.conversation.create({
            data: {
                contactId: contacts[1].id,
                status: 'ACTIVE',
                lastMessageAt: new Date(),
                isRead: true
            }
        }),
        prisma.conversation.create({
            data: {
                contactId: contacts[2].id,
                status: 'PENDING',
                lastMessageAt: new Date(),
                isRead: false
            }
        })
    ])

    console.log(`✅ Created ${conversations.length} test conversations`)

    // Create messages for conversations
    const messages = await Promise.all([
        // Conversation 1 messages
        prisma.message.create({
            data: {
                conversationId: conversations[0].id,
                content: 'مرحباً! كيف يمكنني مساعدتك؟',
                direction: 'OUTGOING',
                status: 'DELIVERED',
                type: 'TEXT'
            }
        }),
        prisma.message.create({
            data: {
                conversationId: conversations[0].id,
                content: 'أريد الاستفسار عن المنتجات',
                direction: 'INCOMING',
                status: 'READ',
                type: 'TEXT'
            }
        }),
        prisma.message.create({
            data: {
                conversationId: conversations[0].id,
                content: 'بالتأكيد! ما هو المنتج الذي تبحث عنه؟',
                direction: 'OUTGOING',
                status: 'READ',
                type: 'TEXT'
            }
        }),

        // Conversation 2 messages
        prisma.message.create({
            data: {
                conversationId: conversations[1].id,
                content: 'شكراً على طلبك!',
                direction: 'OUTGOING',
                status: 'DELIVERED',
                type: 'TEXT'
            }
        }),
        prisma.message.create({
            data: {
                conversationId: conversations[1].id,
                content: 'متى سيصل الطلب؟',
                direction: 'INCOMING',
                status: 'READ',
                type: 'TEXT'
            }
        }),

        // Conversation 3 messages
        prisma.message.create({
            data: {
                conversationId: conversations[2].id,
                content: 'مرحباً بك!',
                direction: 'OUTGOING',
                status: 'SENT',
                type: 'TEXT'
            }
        })
    ])

    console.log(`✅ Created ${messages.length} test messages`)

    // Create test templates
    const templates = await Promise.all([
        prisma.template.create({
            data: {
                name: 'Welcome Message',
                content: 'مرحباً {{name}}! نحن سعداء بتواصلك معنا. كيف يمكننا مساعدتك اليوم؟',
                category: 'onboarding',
                language: 'ar',
                status: 'APPROVED'
            }
        }),
        prisma.template.create({
            data: {
                name: 'Order Confirmation',
                content: 'تم تأكيد طلبك رقم {{order_id}} بنجاح! سيتم التوصيل خلال {{delivery_time}}.',
                category: 'sales',
                language: 'ar',
                status: 'APPROVED'
            }
        }),
        prisma.template.create({
            data: {
                name: 'Thank You',
                content: 'شكراً لك {{name}} على ثقتك بنا! نتمنى لك تجربة رائعة.',
                category: 'marketing',
                language: 'ar',
                status: 'APPROVED'
            }
        })
    ])

    console.log(`✅ Created ${templates.length} test templates`)

    // Create test WhatsApp account
    const whatsappAccount = await prisma.whatsAppAccount.create({
        data: {
            name: 'Main Business Account',
            phone: '+966550000000',
            provider: 'whatsapp-web.js',
            status: 'DISCONNECTED'
        }
    })

    console.log(`✅ Created WhatsApp account: ${whatsappAccount.name}`)

    console.log('🎉 Seed completed successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
