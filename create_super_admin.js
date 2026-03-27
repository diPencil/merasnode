#!/usr/bin/env node
/**
 * إنشاء حساب سوبرادمن مباشرة في قاعدة البيانات
 * Creates super admin user directly in DB (no API/secret needed)
 *
 * Usage: node create_super_admin.js [email] [password] [name]
 * Default: meras@meras.com / 123123 / Super Admin
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const email = process.argv[2] || 'meras@meras.com'
const password = process.argv[3] || '123123'
const name = process.argv[4] || 'Super Admin'

const prisma = new PrismaClient()

async function main() {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
        console.error('❌ يوجد بالفعل مستخدم بهذا البريد:', email)
        console.error('   إما استخدم بريداً آخر أو احذف المستخدم من قاعدة البيانات ثم أعد التشغيل.')
        process.exit(1)
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || `superadmin-${Date.now()}`

    const user = await prisma.user.create({
        data: {
            email,
            username,
            password: hashedPassword,
            name,
            role: 'ADMIN',
            hiddenFromUserList: true,
            status: 'ONLINE',
        },
    })

    console.log('✅ تم إنشاء السوبرادمن بنجاح')
    console.log('   Email:', user.email)
    console.log('   Name:', user.name)
    console.log('   Username (للتسجيل):', user.username)
    console.log('   Password:', password)
}

main()
    .catch((e) => {
        console.error('❌ فشل إنشاء السوبرادمن:', e.message)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
