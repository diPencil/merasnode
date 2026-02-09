const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10)
    
    const admin = await prisma.user.create({
        data: {
            name: 'System Admin',
            username: 'admin',
            email: 'admin@meras.com',
            password: hashedPassword,
            role: 'ADMIN',
            status: 'ONLINE'
        }
    })
    console.log('✅ Created Admin:', { id: admin.id, name: admin.name, email: admin.email })
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
