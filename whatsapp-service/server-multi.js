const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const MultiClientManager = require('./multi-client-manager');

const app = express();
const PORT = process.env.PORT || 3001;
const NEXT_APP_URL = process.env.NEXT_APP_URL || 'http://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Multi-Client Manager
const manager = new MultiClientManager(NEXT_APP_URL);

// Event listeners
manager.on('qr', async ({ accountId, qr }) => {
    console.log(`📱 QR Code ready for account: ${accountId}`);
    // You can broadcast this via WebSocket if needed
});

manager.on('ready', ({ accountId, phone }) => {
    console.log(`✅ Account ${accountId} (${phone}) is ready!`);
});

manager.on('disconnected', ({ accountId, reason }) => {
    console.log(`⚠️ Account ${accountId} disconnected: ${reason}`);
});

// ======================
// API ENDPOINTS
// ======================

/**
 * GET /status
 * Get all accounts status
 */
app.get('/status', (req, res) => {
    const statuses = manager.getAllClientsStatus();
    res.json({
        success: true,
        accounts: statuses
    });
});

/**
 * GET /status/:accountId
 * Get specific account status
 */
app.get('/status/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const status = manager.getClientStatus(accountId);

        if (!status.exists) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }

        // Generate QR code image if available
        let qrCodeImage = null;
        if (status.qrCode) {
            qrCodeImage = await qrcode.toDataURL(status.qrCode);
        }

        res.json({
            success: true,
            accountId: status.accountId,
            isReady: status.isReady,
            status: status.status,
            phone: status.phone,
            qrCode: qrCodeImage
        });
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /reload-accounts
 * Reload all accounts from database
 */
app.post('/reload-accounts', async (req, res) => {
    try {
        console.log('🔄 Reloading all accounts from database...');

        // Shutdown existing clients
        await manager.shutdownAll();

        // Reload accounts
        await loadExistingAccounts();

        res.json({
            success: true,
            message: 'Accounts reloaded successfully'
        });
    } catch (error) {
        console.error('Error reloading accounts:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /initialize/:accountId
 * Initialize or restart a WhatsApp account
 */
app.post('/initialize/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { phone, force } = req.body;

        console.log(`🔄 Initialize request for ${accountId}, force: ${force}`);

        let clientData;
        if (force) {
            // Force restart (clear session)
            clientData = await manager.restartClient(accountId);
        } else {
            // Normal initialization
            clientData = await manager.initializeClient(accountId, phone);
        }

        res.json({
            success: true,
            message: `Account ${accountId} initialization started`,
            status: clientData.status
        });
    } catch (error) {
        console.error('Error initializing client:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /send
 * Send message from specific account
 */
app.post('/send', async (req, res) => {
    try {
        const {
            accountId,
            phoneNumber,
            message,
            chatId,
            mediaUrl,
            quotedMessageId
        } = req.body;

        // Validate
        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'accountId is required'
            });
        }

        if ((!phoneNumber && !chatId) || (!message && !mediaUrl)) {
            return res.status(400).json({
                success: false,
                error: 'Phone number/Chat ID and message OR media are required'
            });
        }

        const result = await manager.sendMessage(
            accountId,
            phoneNumber,
            message,
            mediaUrl,
            chatId,
            quotedMessageId
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /disconnect/:accountId
 * Disconnect specific account
 */
app.post('/disconnect/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        await manager.disconnectClient(accountId);

        res.json({
            success: true,
            message: `Account ${accountId} disconnected`
        });
    } catch (error) {
        console.error('Error disconnecting:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /chats/:accountId
 * Get chats for specific account
 */
app.get('/chats/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const chats = await manager.getChats(accountId);

        const chatList = chats.map(chat => ({
            id: chat.id._serialized,
            name: chat.name,
            isGroup: chat.isGroup,
            unreadCount: chat.unreadCount,
            timestamp: chat.timestamp
        }));

        res.json({
            success: true,
            chats: chatList,
            count: chatList.length
        });
    } catch (error) {
        console.error('Error getting chats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /group/:accountId/:groupId
 * Get details for a specific group
 */
app.get('/group/:accountId/:groupId', async (req, res) => {
    try {
        const { accountId, groupId } = req.params;
        const groupInfo = await manager.getGroupInfo(accountId, groupId);

        res.json({
            success: true,
            group: groupInfo
        });
    } catch (error) {
        console.error('Error getting group info:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    const statuses = manager.getAllClientsStatus();
    const readyCount = statuses.filter(s => s.isReady).length;

    res.json({
        success: true,
        service: 'whatsapp-multi-service',
        totalAccounts: statuses.length,
        readyAccounts: readyCount,
        accounts: statuses
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⚠️ SIGINT received, shutting down gracefully...');
    await manager.shutdownAll();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n⚠️ SIGTERM received, shutting down gracefully...');
    await manager.shutdownAll();
    process.exit(0);
});

// Auto-load existing accounts on startup
async function loadExistingAccounts() {
    try {
        console.log('🔄 Loading existing accounts from database...');

        // Import Prisma here to avoid issues
        const { PrismaClient } = require('../node_modules/@prisma/client');
        const prisma = new PrismaClient();

        // Load all accounts that have been set up (ignore PENDING ones)
        const accounts = await prisma.whatsAppAccount.findMany({
            where: {
                status: {
                    in: ['CONNECTED', 'DISCONNECTED'] // Load accounts that have been configured
                }
            },
            select: {
                id: true,
                phone: true,
                status: true,
                sessionData: true // Include session data
            }
        });

        await prisma.$disconnect();

        console.log(`📱 Found ${accounts.length} accounts to initialize`);

        for (const account of accounts) {
            try {
                console.log(`🔄 Initializing account: ${account.id} (${account.phone}) - Status: ${account.status}`);
                console.log(`   Session data: ${account.sessionData ? 'Available' : 'Not available'}`);

                // Initialize with session data if available
                await manager.initializeClient(account.id, account.phone, account.sessionData);

                // Wait between initializations to avoid conflicts
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                console.error(`❌ Failed to initialize ${account.id}:`, error.message);
                // Continue with other accounts even if one fails
            }
        }

        console.log('✅ Account initialization completed');

    } catch (error) {
        console.error('❌ Error loading existing accounts:', error);
    }
}

// Start server
app.listen(PORT, async () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║  🚀 WhatsApp Multi-Account Service (WhatChimp Style)  ║
║  📡 Running on: http://localhost:${PORT}           ║
║  🔗 Next.js App: ${NEXT_APP_URL}                  ║
╚═══════════════════════════════════════════════════╝
    `);

    // Auto-load existing accounts
    await loadExistingAccounts();

    console.log('✅ Service ready with auto-loaded accounts!');
});

module.exports = app;

