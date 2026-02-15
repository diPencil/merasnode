const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const EventEmitter = require('events');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * Multi-Client Manager for WhatsApp (WhatChimp Style)
 * Supports multiple WhatsApp accounts simultaneously
 */
class MultiClientManager extends EventEmitter {
    constructor(nextAppUrl) {
        super();
        this.clients = new Map(); // accountId → client data
        this.nextAppUrl = nextAppUrl || 'http://localhost:3000';
    }

    /**
     * Initialize a new WhatsApp client for an account
     * @param {string} accountId - Unique account identifier
     * @param {string} phone - Phone number (for reference)
     * @param {object} sessionData - Existing session data from database
     */
    async initializeClient(accountId, phone = null, sessionData = null) {
        console.log(`🔄 Initializing client for account: ${accountId}`);

        // Check if already exists
        if (this.clients.has(accountId)) {
            const existing = this.clients.get(accountId);
            if (existing.isReady) {
                console.log(`✅ Client ${accountId} already ready`);
                return existing;
            }
        }

        // Create auth strategy - prefer existing session if available
        let authStrategy;
        if (sessionData) {
            console.log(`📁 Using existing session data for ${accountId}`);
            authStrategy = new LocalAuth({
                clientId: accountId,
                dataPath: './whatsapp-sessions' // Ensure consistent path
            });
        } else {
            console.log(`🆕 Creating new session for ${accountId}`);
            authStrategy = new LocalAuth({
                clientId: accountId,
                dataPath: './whatsapp-sessions'
            });
        }

        // Create new client
        const client = new Client({
            authStrategy: authStrategy,
            puppeteer: {
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            },
            // Force restart if we have session data (to ensure clean state)
            restartOnAuthFail: true
        });

        // Store client data
        const clientData = {
            client,
            accountId,
            phone,
            isReady: false,
            qrCode: null,
            status: 'INITIALIZING',
            connectedPhone: null
        };

        this.clients.set(accountId, clientData);

        // Setup event handlers
        this.setupClientEvents(accountId, client, clientData);

        // Initialize client
        await client.initialize();

        return clientData;
    }

    /**
     * Setup event handlers for a client
     */
    setupClientEvents(accountId, client, clientData) {
        // QR Code event
        client.on('qr', (qr) => {
            console.log(`📱 QR Code generated for ${accountId}`);
            clientData.qrCode = qr;
            clientData.status = 'QR_GENERATED';

            this.emit('qr', { accountId, qr });

            // Update database
            this.updateDatabaseStatus(accountId, 'WAITING', qr);
        });

        // Ready event
        client.on('ready', async () => {
            console.log(`✅ Client ${accountId} is ready!`);
            clientData.isReady = true;
            clientData.status = 'CONNECTED';
            clientData.qrCode = null;

            // Get phone info
            const info = client.info;
            if (info) {
                clientData.connectedPhone = info.wid.user;
                console.log(`📞 Connected phone: ${clientData.connectedPhone}`);
            }

            this.emit('ready', { accountId, phone: clientData.connectedPhone });

            // Update database
            await this.updateDatabaseStatus(accountId, 'CONNECTED', null);
        });

        // Authenticated event
        client.on('authenticated', () => {
            console.log(`🔐 Client ${accountId} authenticated`);
            clientData.status = 'AUTHENTICATED';
        });

        // Auth failure event
        client.on('auth_failure', (msg) => {
            console.error(`❌ Auth failure for ${accountId}:`, msg);
            clientData.isReady = false;
            clientData.status = 'AUTH_FAILED';

            this.emit('auth_failure', { accountId, error: msg });

            // Update database
            this.updateDatabaseStatus(accountId, 'DISCONNECTED', null);
        });

        // Disconnected event
        client.on('disconnected', async (reason) => {
            console.log(`⚠️ Client ${accountId} disconnected:`, reason);
            clientData.isReady = false;
            clientData.qrCode = null;
            clientData.status = 'DISCONNECTED';

            this.emit('disconnected', { accountId, reason });

            // Update database
            await this.updateDatabaseStatus(accountId, 'DISCONNECTED', null);
        });

        // Message event (Incoming)
        client.on('message', async (message) => {
            await this.processMessage(accountId, message);
        });

        // Message create event (Outgoing - Sync from phone)
        client.on('message_create', async (message) => {
            if (message.fromMe) {
                console.log(`📤 [${accountId}] Outgoing message detected (Sync): ${message.body.substring(0, 50)}...`);
                await this.processMessage(accountId, message);
            }
        });
    }

    /**
     * Process message and send to webhook
     */
    async processMessage(accountId, message) {
        try {
            const chat = await message.getChat();
            const contact = await message.getContact();

            const senderName = contact.pushname || contact.name || contact.number;
            const authorName = senderName; // Capture the real person's name
            const displaySenderName = chat.isGroup ? chat.name : senderName;

            // Handle Media
            let mediaData = null;
            if (message.hasMedia) {
                try {
                    const media = await message.downloadMedia();
                    if (media) {
                        mediaData = {
                            mimetype: media.mimetype,
                            data: media.data, // Base64
                            filename: media.filename
                        };
                        console.log(`📎 [${accountId}] Media downloaded: ${media.mimetype}`);
                    }
                } catch (err) {
                    console.error(`❌ Error downloading media for message ${message.id.id}:`, err);
                }
            }

            // Handle Location
            let locationData = null;
            if (message.type === 'location') {
                locationData = {
                    latitude: message.location.latitude,
                    longitude: message.location.longitude,
                    description: message.location.description
                };
                console.log(`📍 [${accountId}] Location received: ${locationData.latitude}, ${locationData.longitude}`);
            }

            // Resolve mentions (id + name) for correct display in chat
            let mentionsWithNames = []
            try {
                const mentionContacts = await message.getMentions().catch(() => [])
                if (mentionContacts && mentionContacts.length > 0) {
                    mentionsWithNames = mentionContacts.map((c) => {
                        const id = (c.id && (c.id.user || c.id._serialized)) ? (c.id.user || (typeof c.id._serialized === 'string' ? c.id._serialized.replace(/@c\.us|@g\.us/g, '') : '')) : ''
                        const name = (c.pushname || c.name || c.number || '').trim() || id
                        return { id, name }
                    }).filter((m) => m.id)
                } else {
                    const raw = message.mentionedIds
                    if (Array.isArray(raw)) {
                        mentionsWithNames = raw.map((id) => ({
                            id: typeof id === 'string' ? id.replace(/@c\.us|@g\.us/g, '') : String(id || ''),
                            name: ''
                        })).filter((m) => m.id)
                    }
                }
            } catch (e) {
                const raw = message.mentionedIds
                if (Array.isArray(raw)) {
                    mentionsWithNames = raw.map((id) => ({
                        id: typeof id === 'string' ? id.replace(/@c\.us|@g\.us/g, '') : String(id || ''),
                        name: ''
                    })).filter((m) => m.id)
                }
            }

            // Forward to webhook with accountId — full body + caption (no truncation)
            const bodyText = message.body != null ? String(message.body) : ''
            const captionText = message.caption != null ? String(message.caption) : ''
            const waMessageId = (message.id && (message.id._serialized || message.id.id)) ? (message.id._serialized || message.id.id) : null;
            const payload = {
                accountId,
                from: message.from,
                to: message.to,
                body: bodyText || captionText || '',
                caption: captionText || bodyText || undefined,
                timestamp: message.timestamp,
                isGroup: chat.isGroup,
                senderName: displaySenderName,
                authorName: (authorName || '').trim(),
                authorId: message.author || message.from,
                senderId: message.author || message.from,
                fromMe: message.fromMe,
                hasMedia: message.hasMedia,
                media: mediaData,
                location: locationData,
                type: message.type,
                mentions: mentionsWithNames,
                waMessageId
            };

            await fetch(`${this.nextAppUrl}/api/whatsapp/webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            this.emit('message', { accountId, message: payload });
        } catch (error) {
            console.error(`❌ Error handling message for ${accountId}: `, error);
        }
    }

    /**
     * Send message from specific account
     */
    async sendMessage(accountId, phoneNumber, message, mediaUrl = null, chatId = null, quotedMessageId = null) {
        const clientData = this.clients.get(accountId);

        if (!clientData) {
            throw new Error(`Account ${accountId} not found`);
        }
        if (!clientData.isReady) {
            throw new Error(`Account ${accountId} is not ready. Status: ${clientData.status}`);
        }

        const { client } = clientData;

        let targetChatId;
        if (chatId) {
            targetChatId = chatId;
        } else if (phoneNumber.includes('@g.us') || phoneNumber.includes('@c.us')) {
            targetChatId = phoneNumber;
        } else {
            const formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
            targetChatId = `${formattedNumber}@c.us`;
        }

        const quotedOpt = quotedMessageId ? { quotedMessageId } : {};

        console.log(`📤 [${accountId}] Sending to ${targetChatId}` + (quotedMessageId ? ' (reply)' : ''));

        try {
            if (mediaUrl) {
                const media = await MessageMedia.fromUrl(mediaUrl);
                if (message) {
                    await client.sendMessage(targetChatId, media, { caption: message, ...quotedOpt });
                } else {
                    await client.sendMessage(targetChatId, media, quotedOpt);
                }
            } else {
                await client.sendMessage(targetChatId, message, quotedOpt);
            }
        } catch (err) {
            if (quotedMessageId) {
                console.warn(`⚠️ Reply failed (e.g. old/invalid quoted id), sending as normal message: ${err.message || err}`);
                if (mediaUrl) {
                    const media = await MessageMedia.fromUrl(mediaUrl);
                    if (message) await client.sendMessage(targetChatId, media, { caption: message });
                    else await client.sendMessage(targetChatId, media);
                } else {
                    await client.sendMessage(targetChatId, message);
                }
            } else {
                throw err;
            }
        }

        return { success: true, chatId: targetChatId };
    }

    /**
     * Get client status
     */
    getClientStatus(accountId) {
        const clientData = this.clients.get(accountId);
        if (!clientData) {
            return { exists: false };
        }

        return {
            exists: true,
            accountId,
            isReady: clientData.isReady,
            status: clientData.status,
            qrCode: clientData.qrCode,
            phone: clientData.connectedPhone
        };
    }

    /**
     * Get all clients status
     */
    getAllClientsStatus() {
        const statuses = [];
        for (const [accountId, clientData] of this.clients.entries()) {
            statuses.push({
                accountId,
                isReady: clientData.isReady,
                status: clientData.status,
                phone: clientData.connectedPhone,
                hasQrCode: !!clientData.qrCode
            });
        }
        return statuses;
    }

    /**
     * Disconnect a client
     */
    async disconnectClient(accountId) {
        const clientData = this.clients.get(accountId);
        if (!clientData) {
            throw new Error(`Account ${accountId} not found`);
        }

        const { client } = clientData;
        await client.destroy();
        this.clients.delete(accountId);

        console.log(`🔌 Client ${accountId} disconnected and removed`);
    }

    /**
     * Restart a client (force re-authentication)
     */
    async restartClient(accountId) {
        console.log(`🔄 Restarting client ${accountId}...`);

        try {
            await this.disconnectClient(accountId);
            // Brief wait so the browser process can release the session folder
            console.log(`⏳ Waiting 2s for browser to close...`);
            await new Promise(r => setTimeout(r, 2000));
        } catch (error) {
            console.log(`Note: Client ${accountId} was not active`);
        }

        return await this.initializeClient(accountId);
    }

    /**
     * Update database status (always by accountId so DB stays in sync when user scans QR)
     */
    async updateDatabaseStatus(accountId, status, qrCode = null) {
        try {
            const clientData = this.clients.get(accountId);
            const phone = clientData?.connectedPhone || clientData?.phone;

            const payload = {
                accountId,
                status,
                qrCode,
                phone: phone || undefined
            };

            console.log(`📡 Updating database: ${accountId} -> ${status}${phone ? ` (${phone})` : ''}`);

            const response = await fetch(`${this.nextAppUrl}/api/whatsapp/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!result.success) {
                console.warn(`⚠️ Database update response:`, result);
            } else {
                console.log(`✅ Database updated: ${accountId} -> ${status}`);
            }
        } catch (error) {
            console.error(`❌ Failed to update database for ${accountId}:`, error.message);
        }
    }

    /**
     * Get chats for specific account
     */
    async getChats(accountId) {
        const clientData = this.clients.get(accountId);
        if (!clientData || !clientData.isReady) {
            throw new Error(`Account ${accountId} is not ready`);
        }

        const chats = await clientData.client.getChats();
        return chats;
    }

    /**
     * Get group details including participants
     */
    async getGroupInfo(accountId, groupId) {
        const clientData = this.clients.get(accountId);
        if (!clientData || !clientData.isReady) {
            throw new Error(`Account ${accountId} is not ready`);
        }

        const chat = await clientData.client.getChatById(groupId);
        if (!chat.isGroup) {
            throw new Error('This chat is not a group');
        }

        const participants = chat.participants.map(p => ({
            id: p.id._serialized,
            phone: p.id.user,
            isAdmin: p.isAdmin,
            isSuperAdmin: p.isSuperAdmin
        }));

        return {
            id: chat.id._serialized,
            name: chat.name,
            participantsCount: participants.length,
            participants: participants
        };
    }

    /**
     * Shutdown all clients
     */
    async shutdownAll() {
        console.log('🛑 Shutting down all clients...');
        for (const [accountId, clientData] of this.clients.entries()) {
            try {
                await clientData.client.destroy();
                console.log(`✅ Closed ${accountId} `);
            } catch (error) {
                console.error(`Error closing ${accountId}: `, error);
            }
        }
        this.clients.clear();
        console.log('✅ All clients shut down');
    }
}

module.exports = MultiClientManager;

