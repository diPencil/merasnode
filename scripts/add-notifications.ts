import { prisma } from './db'

async function addSampleNotifications() {
    console.log('Adding sample notifications...')

    const notifications = await prisma.notification.createMany({
        data: [
            {
                title: 'New message from Omar Khalil',
                message: 'You have received a new message in your inbox',
                type: 'INFO',
                isRead: false
            },
            {
                title: 'Template approved',
                message: 'Your template "Welcome Message" has been approved',
                type: 'SUCCESS',
                isRead: false
            },
            {
                title: 'New contact added',
                message: 'A new contact "Sarah Ahmed" has been added to your list',
                type: 'INFO',
                isRead: true
            },
            {
                title: 'WhatsApp connected',
                message: 'Your WhatsApp account has been successfully connected',
                type: 'SUCCESS',
                isRead: false
            },
            {
                title: 'System update',
                message: 'A new system update is available. Please review the changes.',
                type: 'WARNING',
                isRead: false
            }
        ]
    })

    console.log(`✅ Created ${notifications.count} sample notifications`)
}

addSampleNotifications()
    .catch((e) => {
        console.error('Error adding notifications:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
