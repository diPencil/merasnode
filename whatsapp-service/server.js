const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;
const NEXT_APP_URL = process.env.NEXT_APP_URL || 'http://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json());

// WhatsApp Client
let client;
let isReady = false;
let qrCodeData = null;
let connectedPhone = null;

// Initialize client
function initializeClient() {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        qrCodeData = qr;
        console.log('📱 QR Code received');
    });

    client.on('ready', async () => {
        isReady = true;
        console.log('✅ WhatsApp client is ready!');

        // Update status in database
        try {
            await fetch(`${NEXT_APP_URL}/api/whatsapp/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CONNECTED' })
            });
        } catch (error) {
            console.error('Failed to update status:', error.message);
        }

        // Auto-sync after 3 seconds
        setTimeout(async () => {
            try {
                console.log('🔄 Auto-syncing chats...');
                const chats = await client.getChats();
                const individualChats = chats.filter(chat => !chat.isGroup);

                for (const chat of individualChats.slice(0, 50)) {
                    const contact = await chat.getContact();
                    const messages = await chat.fetchMessages({ limit: 10 });

                    await fetch(`${NEXT_APP_URL}/api/whatsapp/webhook`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            from: contact.id._serialized,
                            body: messages[0]?.body || '',
                            timestamp: messages[0]?.timestamp || Date.now(),
                            isGroup: false,
                            senderName: contact.pushname || contact.name || contact.number
                        })
                    });
                }
                console.log('✅ Auto-sync completed');
            } catch (error) {
                console.error('Auto-sync error:', error);
            }
        }, 3000);
    });

    client.on('authenticated', () => {
        console.log('🔐 Client authenticated');
    });

    client.on('auth_failure', () => {
        console.error('❌ Authentication failed');
        isReady = false;
    });

    client.on('disconnected', async (reason) => {
        console.log('⚠️ Client disconnected:', reason);
        isReady = false;
        qrCodeData = null;

        // Update status in database
        try {
            await fetch(`${NEXT_APP_URL}/api/whatsapp/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'DISCONNECTED' })
            });
        } catch (error) {
            console.error('Failed to update status:', error.message);
        }
    });

    // Message handler
    client.on('message', async (message) => {
        try {
            const chat = await message.getChat();
            const contact = await message.getContact();

            // Determine sender name
            let senderName = contact.pushname || contact.name || contact.number;
            if (chat.isGroup) {
                senderName = chat.name;
            }

            console.log(`📨 Message received: ${message.body.substring(0, 50)}...`);
            console.log(`👤 Sender: ${senderName} (${chat.isGroup ? 'Group' : 'User'})`);

            // Forward message to Next.js webhook
            console.log(`🔄 Forwarding to Webhook: ${NEXT_APP_URL}/api/whatsapp/webhook`);
            const payload = {
                from: message.from,
                body: message.body,
                timestamp: message.timestamp,
                isGroup: chat.isGroup,
                senderName: senderName,
                senderId: message.author || message.from
            };
            console.log('📦 Payload:', JSON.stringify(payload, null, 2));

            const response = await fetch(`${NEXT_APP_URL}/api/whatsapp/webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const responseText = await response.text();
            console.log(`📡 Webhook Response Status: ${response.status}`);
            console.log(`📡 Webhook Response Body: ${responseText}`);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('❌ Failed to parse webhook response JSON');
            }

            if (data && data.success) {
                console.log('✅ Message saved to database');
            } else {
                console.error('❌ Failed to save message:', data ? data.error : 'Unknown error');
            }
        } catch (error) {
            console.error('❌ Error forwarding message:', error.message);
        }
    });

    client.initialize();
}

// Initialize on startup
initializeClient();

// Send Message
app.post('/send', async (req, res) => {
    try {
        const { phoneNumber, message, chatId: directChatId, mediaUrl, mediaType } = req.body;

        if ((!phoneNumber && !directChatId) || (!message && !mediaUrl)) {
            return res.status(400).json({
                success: false,
                error: 'Phone number/Chat ID and message OR media are required'
            });
        }

        if (!isReady) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client is not ready'
            });
        }

        let chatId;

        // If direct Chat ID is provided (e.g. from groups), use it
        if (directChatId) {
            chatId = directChatId;
        } else if (phoneNumber && phoneNumber.includes('@g.us')) {
            // If phone number contains group suffix, use it directly
            chatId = phoneNumber;
        } else if (phoneNumber) {
            // Otherwise formatting for regular numbers
            const formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
            chatId = `${formattedNumber}@c.us`;
        }

        console.log(`📤 Sending to ${chatId}`);

        if (mediaUrl) {
            // Send Media Message
            console.log(`📎 Sending media: ${mediaUrl}`);
            const media = await MessageMedia.fromUrl(mediaUrl);
            if (message) {
                await client.sendMessage(chatId, media, { caption: message });
            } else {
                await client.sendMessage(chatId, media);
            }
        } else {
            // Send Text Message
            await client.sendMessage(chatId, message);
        }

        res.json({ success: true, chatId });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Endpoint to force sync all chats (Groups + Individuals)
app.get('/sync-chats', async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ success: false, error: 'WhatsApp client not ready' });
    }

    try {
        console.log('🔄 Starting manual chat sync (All)...');
        const chats = await client.getChats();

        let updatedCount = 0;
        for (const chat of chats) {
            console.log(`Processing chat: ${chat.name} (${chat.id._serialized})`);

            // Skip status updates or weird chats
            if (chat.id._serialized === 'status@broadcast') continue;

            const isGroup = chat.isGroup;
            // For individuals, name might be empty, try to get from contact
            let name = chat.name;
            if (!isGroup && !name) {
                try {
                    const contact = await chat.getContact();
                    name = contact.pushname || contact.name || chat.id.user;
                } catch (contactErr) {
                    console.warn(`Failed to resolve contact for ${chat.id._serialized}, using ID`, contactErr.message);
                    name = chat.id.user;
                }
            }

            // Call webhook to update/create contact and conversation
            try {
                await fetch(`${NEXT_APP_URL}/api/whatsapp/webhook`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from: chat.id._serialized,
                        body: `SYNC_HISTORY: ${chat.lastMessage ? chat.lastMessage.body : 'Chat Synced'}`, // Use last message or dummy
                        timestamp: chat.timestamp || Date.now() / 1000,
                        isGroup: isGroup,
                        senderName: name || chat.id.user,
                        senderId: chat.id._serialized // Ensure ID is passed
                    })
                });
                updatedCount++;
            } catch (err) {
                console.error(`Failed to update chat ${name}:`, err.message);
            }
        }

        res.json({ success: true, message: `Synced ${updatedCount} chats (Groups & Individuals)` });
    } catch (error) {
        console.error('Error syncing chats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Function to update database status
async function updateDatabaseStatus(status, name = null) {
    if (!connectedPhone) {
        console.log('⚠️ No phone number available, skipping database update');
        return;
    }

    try {
        console.log(`📡 Updating status for ${connectedPhone} (${name}) to ${status}`);
        const response = await fetch(`${NEXT_APP_URL}/api/whatsapp/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: connectedPhone.replace('@c.us', ''), // Ensure clean phone number
                status: status,
                name: name
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log(`✅ Database status updated to: ${status}`);
        } else {
            console.error('❌ Failed to update database status:', data.error);
        }
    } catch (error) {
        console.error('❌ Error updating database status:', error.message);
    }
}

// Initialize WhatsApp Client
function initializeWhatsApp() {
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    // QR Code Event
    client.on('qr', async (qr) => {
        console.log('📱 QR Code received!');
        try {
            qrCodeData = await qrcode.toDataURL(qr);
            console.log('✅ QR Code generated as Data URL');
        } catch (err) {
            console.error('❌ Error generating QR code:', err);
        }
    });

    // Ready Event
    client.on('ready', async () => {
        console.log('✅ WhatsApp Client is ready!');
        isReady = true;
        qrCodeData = null;

        // Get phone number and name from client info
        let retries = 0;
        let connectedName = null;
        while (!connectedPhone && retries < 5) {
            if (client.info && client.info.wid) {
                connectedPhone = client.info.wid.user;
                connectedName = client.info.pushname;
                console.log(`📱 Connected phone: ${connectedPhone}, Name: ${connectedName}`);
                break;
            }
            retries++;
            console.log(`⏳ Waiting for client info... (${retries}/5)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Update database status to CONNECTED
        if (connectedPhone) {
            await updateDatabaseStatus('CONNECTED', connectedName);
        } else {
            console.error('❌ Failed to get phone number from client info');
        }

        // DEBUG: List all groups
        console.log('🔍 Listing all groups...');
        const chats = await client.getChats();
        const groups = chats.filter(c => c.isGroup);
        groups.forEach(g => {
            console.log(`👥 Group: ${g.name} (ID: ${g.id._serialized})`);
        });

        // AUTO-SYNC: Automatically sync all chats on connection
        console.log('🔄 Auto-syncing all chats...');
        setTimeout(async () => {
            try {
                let updatedCount = 0;
                for (const chat of chats) {
                    // Skip status broadcasts
                    if (chat.id._serialized === 'status@broadcast') continue;

                    const isGroup = chat.isGroup;
                    let name = chat.name;
                    if (!isGroup && !name) {
                        try {
                            const contact = await chat.getContact();
                            name = contact.pushname || contact.name || chat.id.user;
                        } catch (contactErr) {
                            name = chat.id.user;
                        }
                    }

                    try {
                        await fetch(`${NEXT_APP_URL}/api/whatsapp/webhook`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                from: chat.id._serialized,
                                body: `AUTO_SYNC: ${chat.lastMessage ? chat.lastMessage.body : 'Chat Synced'}`,
                                timestamp: chat.timestamp || Date.now() / 1000,
                                isGroup: isGroup,
                                senderName: name || chat.id.user,
                                senderId: chat.id._serialized
                            })
                        });
                        updatedCount++;
                    } catch (err) {
                        console.error(`Failed to sync chat ${name}:`, err.message);
                    }
                }
                console.log(`✅ Auto-synced ${updatedCount} chats`);
            } catch (error) {
                console.error('❌ Auto-sync failed:', error);
            }
        }, 3000); // Wait 3 seconds after ready to ensure everything is stable
    });

    // Authenticated Event
    client.on('authenticated', () => {
        console.log('🔐 WhatsApp Client authenticated!');
    });

    // Auth Failure Event
    client.on('auth_failure', (msg) => {
        console.error('❌ WhatsApp authentication failed:', msg);
        isReady = false;
    });

    // Disconnected Event
    client.on('disconnected', async (reason) => {
        console.log('🔌 WhatsApp Client disconnected:', reason);
        isReady = false;
        qrCodeData = null;

        // Update database status to DISCONNECTED
        await updateDatabaseStatus('DISCONNECTED');
    });

    // Message Event
    client.on('message', async (message) => {
        console.log('📨 Message received:', message.body);

        try {
            // Get chat info to resolve name (user or group name)
            const chat = await message.getChat();
            const contact = await message.getContact();

            console.log('🔍 Debug Chat:', { name: chat.name, isGroup: chat.isGroup });
            console.log('🔍 Debug Contact:', { name: contact.name, pushname: contact.pushname });

            const senderName = chat.isGroup ? chat.name : (contact.pushname || contact.name || chat.name);
            console.log(`👤 Sender: ${senderName} (${chat.isGroup ? 'Group' : 'User'})`);

            // Forward message to Next.js webhook
            console.log(`🔄 Forwarding to Webhook: ${NEXT_APP_URL}/api/whatsapp/webhook`);
            const payload = {
                from: message.from,
                body: message.body,
                timestamp: message.timestamp,
                isGroup: chat.isGroup,
                senderName: senderName,
                senderId: message.author || message.from
            };
            console.log('📦 Payload:', JSON.stringify(payload, null, 2));

            const response = await fetch(`${NEXT_APP_URL}/api/whatsapp/webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const responseText = await response.text();
            console.log(`📡 Webhook Response Status: ${response.status}`);
            console.log(`📡 Webhook Response Body: ${responseText}`);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('❌ Failed to parse webhook response JSON');
            }

            if (data && data.success) {
                console.log('✅ Message saved to database');
            } else {
                console.error('❌ Failed to save message:', data ? data.error : 'Unknown error');
            }
        } catch (error) {
            console.error('❌ Error forwarding message:', error.message);
        }
    });

    // Initialize
    client.initialize();
}

// Routes

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'WhatsApp Service',
        port: PORT
    });
});

// Get Status
app.get('/status', (req, res) => {
    res.json({
        success: true,
        isReady,
        hasQR: !!qrCodeData,
        qrCode: qrCodeData
    });
});

// Initialize Connection
app.post('/initialize', async (req, res) => {
    try {
        const { force } = req.body;

        if (client) {
            if (isReady && !force) {
                return res.json({
                    success: true,
                    message: 'WhatsApp client is already ready'
                });
            }

            // If force is true or client exists but not ready
            console.log(force ? '⚠️ Force re-initialization requested...' : '⚠️ Re-initializing stuck client...');
            try {
                await client.destroy();

                // If force is true, allow some time for cleanup and THEN delete auth folder
                if (force) {
                    console.log('🧹 Cleaning up session data...');
                    const authPath = path.join(__dirname, '.wwebjs_auth');
                    if (fs.existsSync(authPath)) {
                        fs.rmSync(authPath, { recursive: true, force: true });
                        console.log('🗑️ Session data deleted');
                    }
                }
            } catch (e) {
                console.error('Error destroying client/cleaning session:', e);
            }
            client = null;
            isReady = false;
            qrCodeData = null;
        }

        initializeWhatsApp();
        res.json({
            success: true,
            message: 'WhatsApp client initialization started'
        });

    } catch (error) {
        console.error('Error initializing WhatsApp:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Send Message
app.post('/send', async (req, res) => {
    try {
        const { phoneNumber, message, chatId: directChatId, mediaUrl } = req.body;

        if ((!phoneNumber && !directChatId) || (!message && !mediaUrl)) {
            return res.status(400).json({
                success: false,
                error: 'Phone number/Chat ID and message OR media are required'
            });
        }

        if (!isReady) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client is not ready'
            });
        }

        let chatId;

        // If direct Chat ID is provided (e.g. from groups), use it
        if (directChatId) {
            chatId = directChatId;
        } else if (phoneNumber && phoneNumber.includes('@g.us')) {
            // If phone number contains group suffix, use it directly
            chatId = phoneNumber;
        } else if (phoneNumber) {
            // Otherwise formatting for regular numbers
            const formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
            chatId = `${formattedNumber}@c.us`;
        }

        console.log(`📤 Sending to ${chatId}`);

        if (mediaUrl) {
            // Send Media Message
            console.log(`📎 Sending media: ${mediaUrl}`);
            try {
                const media = await MessageMedia.fromUrl(mediaUrl);
                if (message) {
                    await client.sendMessage(chatId, media, { caption: message });
                } else {
                    await client.sendMessage(chatId, media);
                }
            } catch (mediaError) {
                console.error('Failed to load media:', mediaError);
                return res.status(400).json({ success: false, error: 'Failed to load media URL' });
            }
        } else {
            // Send Text Message
            await client.sendMessage(chatId, message);
        }

        res.json({
            success: true,
            message: 'Message sent successfully'
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Disconnect
app.post('/disconnect', async (req, res) => {
    try {
        if (client) {
            await client.destroy();
            client = null;
            isReady = false;
            qrCodeData = null;
        }
        res.json({
            success: true,
            message: 'WhatsApp client disconnected'
        });
    } catch (error) {
        console.error('Error disconnecting WhatsApp:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 WhatsApp Service running on http://localhost:${PORT}`);
    console.log(`📱 Ready to handle WhatsApp Web connections`);
});
