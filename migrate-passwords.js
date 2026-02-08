#!/usr/bin/env node

/**
 * 🔄 Password Migration Script
 * 
 * Migrates plain text passwords to bcrypt hashed passwords
 * For existing users in the database
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const readline = require('readline')

const prisma = new PrismaClient()

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m'
}

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`)
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function question(query) {
    return new Promise(resolve => rl.question(query, resolve))
}

async function migratePasswords() {
    log('\n╔═══════════════════════════════════════════════════════════╗', colors.cyan)
    log('║         🔄 Password Migration Script 🔄                   ║', colors.cyan)
    log('╚═══════════════════════════════════════════════════════════╝\n', colors.cyan)
    
    log('⚠️  WARNING: This will update all plain text passwords to hashed passwords', colors.yellow)
    log('⚠️  Make sure you have a backup of your database before proceeding!\n', colors.yellow)
    
    const confirm = await question('Do you want to continue? (yes/no): ')
    
    if (confirm.toLowerCase() !== 'yes') {
        log('\n❌ Migration cancelled', colors.red)
        process.exit(0)
    }
    
    log('\n🔄 Starting password migration...', colors.cyan)
    
    try {
        // Get all users
        const users = await prisma.user.findMany()
        
        if (users.length === 0) {
            log('\n⚠️  No users found in database', colors.yellow)
            process.exit(0)
        }
        
        log(`\n📊 Found ${users.length} users\n`, colors.cyan)
        
        let migrated = 0
        let skipped = 0
        let errors = 0
        
        for (const user of users) {
            try {
                // Check if password is already hashed
                // Bcrypt hashes start with $2a$, $2b$, or $2y$
                if (user.password.startsWith('$2a$') || 
                    user.password.startsWith('$2b$') || 
                    user.password.startsWith('$2y$')) {
                    log(`⏭️  ${user.email.padEnd(40)} - Already hashed`, colors.yellow)
                    skipped++
                    continue
                }
                
                // Hash the plain text password
                const hashedPassword = await bcrypt.hash(user.password, 10)
                
                // Update user with hashed password
                await prisma.user.update({
                    where: { id: user.id },
                    data: { password: hashedPassword }
                })
                
                log(`✅ ${user.email.padEnd(40)} - Migrated`, colors.green)
                migrated++
            } catch (error) {
                log(`❌ ${user.email.padEnd(40)} - Error: ${error.message}`, colors.red)
                errors++
            }
        }
        
        log('\n' + '='.repeat(60), colors.bright)
        log('🎉 Migration complete!', colors.green)
        log('='.repeat(60), colors.bright)
        log(`\n📊 Summary:`, colors.cyan)
        log(`   ✅ Successfully migrated: ${migrated}`, colors.green)
        log(`   ⏭️  Already hashed (skipped): ${skipped}`, colors.yellow)
        log(`   ❌ Errors: ${errors}`, colors.red)
        log(`   📊 Total users: ${users.length}\n`, colors.cyan)
        
        if (migrated > 0) {
            log('✅ All passwords have been successfully hashed!', colors.green)
            log('🔐 Users can now login with their existing passwords', colors.green)
        }
        
        if (errors > 0) {
            log('\n⚠️  Some passwords failed to migrate. Please check the errors above.', colors.yellow)
        }
        
    } catch (error) {
        log('\n❌ Fatal error during migration:', colors.red)
        console.error(error)
        process.exit(1)
    }
}

// Run migration
migratePasswords()
    .catch((error) => {
        log('\n❌ Unexpected error:', colors.red)
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        rl.close()
        await prisma.$disconnect()
    })
