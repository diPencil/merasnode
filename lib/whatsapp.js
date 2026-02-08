const { Client, LocalAuth } = require('whatsapp-web.js');

// Make qrcode-terminal optional
let qrcode;
try {
    qrcode = require('qrcode-terminal');
} catch (e) {
    console.log('qrcode-terminal not available');
}

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.qrCode = null;
    }

    initialize() {
        this.client = new Client({
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
        this.client.on('qr', (qr) => {
            console.log('QR Code received!');
            this.qrCode = qr;
            if (qrcode) {
                qrcode.generate(qr, { small: true });
            }
        });

        // Ready Event
        this.client.on('ready', () => {
            console.log('WhatsApp Client is ready!');
            this.isReady = true;
            this.qrCode = null;
        });

        // Authenticated Event
        this.client.on('authenticated', () => {
            console.log('WhatsApp Client authenticated!');
        });

        // Auth Failure Event
        this.client.on('auth_failure', (msg) => {
            console.error('WhatsApp authentication failed:', msg);
        });

        // Disconnected Event
        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp Client disconnected:', reason);
            this.isReady = false;
        });

        // Message Event
        this.client.on('message', async (message) => {
            console.log('Message received:', message.body);
            // Handle incoming messages here
            // You can save to database, trigger bot flows, etc.
        });

        // Initialize the client
        this.client.initialize();
    }

    async sendMessage(phoneNumber, message) {
        if (!this.isReady) {
            throw new Error('WhatsApp client is not ready');
        }

        try {
            // Format phone number (remove + and spaces)
            const formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
            const chatId = `${formattedNumber}@c.us`;

            await this.client.sendMessage(chatId, message);
            return { success: true, message: 'Message sent successfully' };
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async getQRCode() {
        return this.qrCode;
    }

    async getStatus() {
        return {
            isReady: this.isReady,
            hasQR: !!this.qrCode
        };
    }

    async disconnect() {
        if (this.client) {
            await this.client.destroy();
            this.isReady = false;
            this.qrCode = null;
        }
    }
}

// Create singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
