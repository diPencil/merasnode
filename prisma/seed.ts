const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting seed...')

    // Delete existing data first
    console.log('🗑️  Cleaning up old data...')
    await prisma.log.deleteMany({})
    await prisma.notification.deleteMany({})
    await prisma.message.deleteMany({})
    await prisma.conversation.deleteMany({})
    await prisma.template.deleteMany({})
    await prisma.whatsAppAccount.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.contact.deleteMany({})
    await prisma.branch.deleteMany({})
    console.log('✅ Old data cleaned')

    // Create Main Branch
    const mainBranch = await prisma.branch.create({
        data: {
            name: 'Meras Main Branch',
            address: 'Riyadh, Saudi Arabia',
            phone: '920000000',
            email: 'main@meras.com'
        }
    })
    console.log('✅ Created Main Branch')

    // Create Admin User (username: admin for login with email or username)
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const adminUser = await prisma.user.create({
        data: {
            name: 'System Admin',
            username: 'admin',
            email: 'admin@meras.com',
            password: hashedPassword,
            role: 'ADMIN',
            status: 'OFFLINE',
            branches: {
                connect: { id: mainBranch.id }
            }
        }
    })
    console.log('✅ Created Admin User (admin@meras.com or username "admin" / admin123)')

    console.log('🎉 Seed completed successfully! (Clean install: Admin + Main Branch only)')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
