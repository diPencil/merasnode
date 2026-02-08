
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const branches = await prisma.branch.findMany()
    const accounts = await prisma.whatsAppAccount.findMany()

    console.log('Branches:', branches.length)
    console.log('WhatsApp Accounts:', accounts.length)

    if (branches.length > 0) {
        console.log('Sample Branch:', branches[0].name)
    }
    if (accounts.length > 0) {
        console.log('Sample Account:', accounts[0].name, accounts[0].phone)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
