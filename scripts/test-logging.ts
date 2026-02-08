import { prisma } from '../lib/db'
import { logActivity } from '../lib/logger'

async function testLogging() {
    console.log('Testing Activity Logging...')

    try {
        // Test 1: Direct database write
        console.log('\n1. Testing direct database write...')
        const directLog = await prisma.log.create({
            data: {
                action: 'TEST',
                entityType: 'System',
                ipAddress: '127.0.0.1',
                userAgent: 'Test Script',
                metadata: {
                    description: 'Direct database test'
                }
            }
        })
        console.log('✅ Direct write successful:', directLog.id)

        // Test 2: Using logActivity function
        console.log('\n2. Testing logActivity function...')
        await logActivity({
            action: 'TEST',
            entityType: 'System',
            description: 'Testing logActivity function'
        })
        console.log('✅ logActivity function executed')

        // Test 3: Check total logs count
        console.log('\n3. Checking total logs in database...')
        const count = await prisma.log.count()
        console.log(`📊 Total logs in database: ${count}`)

        // Test 4: Fetch recent logs
        console.log('\n4. Fetching recent logs...')
        const recentLogs = await prisma.log.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        })
        console.log(`📋 Recent ${recentLogs.length} logs:`)
        recentLogs.forEach(log => {
            console.log(`   - ${log.action} ${log.entityType} at ${log.createdAt}`)
        })

    } catch (error) {
        console.error('❌ Error during testing:', error)
    } finally {
        await prisma.$disconnect()
    }
}

testLogging()
