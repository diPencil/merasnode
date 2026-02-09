#!/usr/bin/env node

/**
 * 🚀 Meras CRM - Setup CLI Tool
 * 
 * أداة موحدة لإعداد قاعدة البيانات والبيانات الأولية
 * Unified tool for database setup and initial data
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const readline = require('readline')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m'
}

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`)
}

function success(message) {
    log(`✅ ${message}`, colors.green)
}

function error(message) {
    log(`❌ ${message}`, colors.red)
}

function info(message) {
    log(`ℹ️  ${message}`, colors.cyan)
}

function warning(message) {
    log(`⚠️  ${message}`, colors.yellow)
}

function header(message) {
    log(`\n${'='.repeat(60)}`, colors.bright)
    log(`  ${message}`, colors.bright)
    log(`${'='.repeat(60)}\n`, colors.bright)
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function question(query) {
    return new Promise(resolve => rl.question(query, resolve))
}

async function checkDatabaseConnection() {
    try {
        await prisma.$connect()
        success('Database connection successful')
        return true
    } catch (err) {
        error('Failed to connect to database')
        console.error(err)
        return false
    }
}

async function applyPrismaSchema() {
    info('Applying Prisma schema to database...')
    const { execSync } = require('child_process')
    
    try {
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })
        success('Prisma schema applied successfully')
        return true
    } catch (err) {
        error('Failed to apply Prisma schema')
        console.error(err)
        return false
    }
}

async function createAdmin(email, password, name) {
    try {
        // Check if admin already exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email }
        })

        if (existingAdmin) {
            warning(`Admin with email ${email} already exists`)
            return existingAdmin
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Derive username from email (local part, sanitized) for login with email or username
        const username = (email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 50) || 'admin'
        const admin = await prisma.user.create({
            data: {
                name,
                username,
                email,
                password: hashedPassword,
                role: 'ADMIN',
                status: 'ONLINE'
            }
        })

        success(`Admin created: ${admin.name} (${admin.email})`)
        return admin
    } catch (err) {
        error('Failed to create admin')
        console.error(err)
        return null
    }
}

async function createAgent(email, password, name) {
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            warning(`User with email ${email} already exists`)
            return existingUser
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        const username = (email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 50) || 'agent'
        const agent = await prisma.user.create({
            data: {
                name,
                username,
                email,
                password: hashedPassword,
                role: 'AGENT',
                status: 'OFFLINE'
            }
        })

        success(`Agent created: ${agent.name} (${agent.email})`)
        return agent
    } catch (err) {
        error('Failed to create agent')
        console.error(err)
        return null
    }
}

async function createSettings() {
    try {
        const existingSettings = await prisma.settings.findFirst()
        
        if (existingSettings) {
            info('Settings already exist')
            return existingSettings
        }

        const settings = await prisma.settings.create({
            data: {
                companyName: 'Meras CRM',
                timezone: 'UTC+03:00',
                language: 'ar',
                newMessagesNotif: true,
                assignmentNotif: true,
                templateNotif: false,
                dailySummaryNotif: true,
                twoFactorEnabled: false
            }
        })

        success('Default settings created')
        return settings
    } catch (err) {
        error('Failed to create settings')
        console.error(err)
        return null
    }
}

async function createSampleData() {
    try {
        info('Creating sample data...')

        // Create sample branch
        const branch = await prisma.branch.create({
            data: {
                name: 'Main Branch',
                address: 'Riyadh, Saudi Arabia',
                phone: '+966500000000',
                email: 'info@meras.com',
                isActive: true
            }
        })
        success('Sample branch created')

        // Create sample contacts
        const contacts = await Promise.all([
            prisma.contact.create({
                data: {
                    name: 'Ahmed Mohamed',
                    phone: '+966501234567',
                    email: 'ahmed@example.com',
                    branchId: branch.id
                }
            }),
            prisma.contact.create({
                data: {
                    name: 'Sara Ali',
                    phone: '+966509876543',
                    email: 'sara@example.com',
                    branchId: branch.id
                }
            })
        ])
        success(`Created ${contacts.length} sample contacts`)

        // Create sample templates
        const templates = await Promise.all([
            prisma.template.create({
                data: {
                    name: 'Welcome Message',
                    content: 'مرحباً {{name}}! نحن سعداء بتواصلك معنا.',
                    category: 'onboarding',
                    language: 'ar',
                    status: 'APPROVED'
                }
            }),
            prisma.template.create({
                data: {
                    name: 'Thank You',
                    content: 'شكراً لك على ثقتك بنا!',
                    category: 'marketing',
                    language: 'ar',
                    status: 'APPROVED'
                }
            })
        ])
        success(`Created ${templates.length} sample templates`)

        return { branch, contacts, templates }
    } catch (err) {
        error('Failed to create sample data')
        console.error(err)
        return null
    }
}

async function fullSetup() {
    header('🚀 Meras CRM - Full Setup')
    
    // 1. Check database connection
    const connected = await checkDatabaseConnection()
    if (!connected) {
        error('Setup aborted: Cannot connect to database')
        process.exit(1)
    }

    // 2. Apply Prisma schema
    const schemaApplied = await applyPrismaSchema()
    if (!schemaApplied) {
        error('Setup aborted: Failed to apply schema')
        process.exit(1)
    }

    // 3. Create default admin
    info('\n📝 Creating default admin user...')
    await createAdmin('admin@meras.com', 'admin123', 'System Admin')

    // 4. Create default settings
    info('\n⚙️  Creating default settings...')
    await createSettings()

    // 5. Ask if user wants sample data
    const wantsSampleData = await question('\n📊 Do you want to create sample data? (y/n): ')
    if (wantsSampleData.toLowerCase() === 'y' || wantsSampleData.toLowerCase() === 'yes') {
        await createSampleData()
    }

    success('\n🎉 Setup completed successfully!')
    info('\n📝 Default Admin Credentials:')
    info('   Email: admin@meras.com')
    info('   Password: admin123')
    warning('\n⚠️  Please change the default password after first login!')
}

async function quickSetup() {
    header('⚡ Quick Setup (Admin Only)')
    
    // Check connection
    const connected = await checkDatabaseConnection()
    if (!connected) {
        error('Setup aborted: Cannot connect to database')
        process.exit(1)
    }

    // Create admin
    await createAdmin('admin@meras.com', 'admin123', 'System Admin')
    
    success('\n✅ Admin user created!')
    info('   Email: admin@meras.com')
    info('   Password: admin123')
}

function deriveUsername(email) {
    return (email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 50) || 'user'
}

async function interactiveCreateUser() {
    header('👤 Create New User')
    
    const name = await question('Name: ')
    const email = await question('Email: ')
    const usernameInput = await question('Username (letters, numbers, underscores) [from email]: ')
    const password = await question('Password: ')
    const roleInput = await question('Role (1=Admin, 2=Supervisor, 3=Agent) [3]: ')
    
    const roleMap = {
        '1': 'ADMIN',
        '2': 'SUPERVISOR',
        '3': 'AGENT'
    }
    
    const role = roleMap[roleInput] || 'AGENT'
    const username = usernameInput.trim() ? usernameInput.trim().replace(/\s/g, '').toLowerCase().slice(0, 50) : deriveUsername(email)
    const hashedPassword = await bcrypt.hash(password, 10)
    
    try {
        const user = await prisma.user.create({
            data: {
                name,
                username,
                email,
                password: hashedPassword,
                role,
                status: 'OFFLINE'
            }
        })
        
        success(`\n✅ User created successfully!`)
        info(`   Name: ${user.name}`)
        info(`   Email: ${user.email}`)
        info(`   Role: ${user.role}`)
    } catch (err) {
        error('Failed to create user')
        console.error(err)
    }
}

async function showMenu() {
    header('🎯 Meras CRM - Setup Menu')
    
    console.log('1. Full Setup (Database + Admin + Settings + Sample Data)')
    console.log('2. Quick Setup (Create Admin Only)')
    console.log('3. Create New User (Interactive)')
    console.log('4. Create Sample Data')
    console.log('5. Reset Database (⚠️  Dangerous!)')
    console.log('6. Check Database Connection')
    console.log('0. Exit')
    
    const choice = await question('\nEnter your choice: ')
    
    switch (choice) {
        case '1':
            await fullSetup()
            break
        case '2':
            await quickSetup()
            break
        case '3':
            await interactiveCreateUser()
            break
        case '4':
            await createSampleData()
            break
        case '5':
            const confirm = await question('⚠️  This will delete ALL data! Type "YES" to confirm: ')
            if (confirm === 'YES') {
                info('Resetting database...')
                await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0;`
                
                // Delete all data
                await prisma.message.deleteMany({})
                await prisma.conversation.deleteMany({})
                await prisma.note.deleteMany({})
                await prisma.booking.deleteMany({})
                await prisma.invoice.deleteMany({})
                await prisma.contact.deleteMany({})
                await prisma.notification.deleteMany({})
                await prisma.log.deleteMany({})
                await prisma.user.deleteMany({})
                await prisma.whatsAppAccount.deleteMany({})
                await prisma.branch.deleteMany({})
                await prisma.template.deleteMany({})
                await prisma.botFlow.deleteMany({})
                await prisma.offer.deleteMany({})
                await prisma.settings.deleteMany({})
                await prisma.apiKey.deleteMany({})
                await prisma.crmIntegration.deleteMany({})
                
                await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1;`
                success('Database reset complete')
            } else {
                info('Reset cancelled')
            }
            break
        case '6':
            await checkDatabaseConnection()
            break
        case '0':
            info('Goodbye!')
            process.exit(0)
            break
        default:
            warning('Invalid choice')
    }
    
    // Ask if user wants to continue
    const continueChoice = await question('\nPress Enter to continue or type "exit" to quit: ')
    if (continueChoice.toLowerCase() === 'exit') {
        process.exit(0)
    }
    
    await showMenu()
}

// Main execution
async function main() {
    log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           🚀  Meras CRM - Setup CLI Tool  🚀              ║
║                                                           ║
║        Unified Database Setup & Management Tool           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`, colors.cyan)

    // Check command line arguments
    const args = process.argv.slice(2)
    
    if (args.length === 0) {
        // Interactive menu
        await showMenu()
    } else {
        // Command line mode
        const command = args[0]
        
        switch (command) {
            case 'full':
            case 'setup':
                await fullSetup()
                break
            case 'quick':
            case 'admin':
                await quickSetup()
                break
            case 'sample':
            case 'seed':
                await createSampleData()
                break
            case 'check':
            case 'test':
                await checkDatabaseConnection()
                break
            case 'menu':
                await showMenu()
                break
            default:
                error(`Unknown command: ${command}`)
                info('\nAvailable commands:')
                info('  node setup-cli.js full    - Full setup')
                info('  node setup-cli.js quick   - Quick admin setup')
                info('  node setup-cli.js sample  - Create sample data')
                info('  node setup-cli.js check   - Check database connection')
                info('  node setup-cli.js menu    - Interactive menu')
        }
    }
}

// Run and handle cleanup
main()
    .catch((err) => {
        error('Fatal error occurred:')
        console.error(err)
        process.exit(1)
    })
    .finally(async () => {
        rl.close()
        await prisma.$disconnect()
    })
