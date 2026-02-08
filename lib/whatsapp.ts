import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';

// Global types to prevent dev-server reloading issues
declare global {
    var whatsappClient: Client | undefined;
    var qrCodeData: string | null;
    var clientStatus: 'INITIALIZING' | 'WAITING_FOR_SCAN' | 'CONNECTED' | 'DISCONNECTED';
    var connectedUserInfo: { name: string; phone: string } | null;
}

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'whatsapp.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    try {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    } catch (e) {
        console.error('Failed to create log directory', e);
    }
}

const log = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}\n`;

    // Write to file
    try {
        fs.appendFileSync(LOG_FILE, logMessage);
    } catch (e) {
        console.error('Failed to write to log file', e);
    }

    // Also log to console
    console.log(logMessage);
};

let client: Client;

const getClient = () => {
    if (global.whatsappClient) {
        return global.whatsappClient;
    }

    log('>>> [WhatsApp] Creating NEW Client Instance (Safe Mode)...');

    // SAFE MODE: Minimal arguments to ensure stability
    const newClient = new Client({
        authStrategy: new LocalAuth({ clientId: "client-one" }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu'
            ],
            timeout: 60000 // 60s timeout
        }
    });

    // Event Listeners
    newClient.on('qr', async (qr) => {
        log('>>> [WhatsApp] QR RECEIVED');
        try {
            global.qrCodeData = await qrcode.toDataURL(qr);
            global.clientStatus = 'WAITING_FOR_SCAN';
            global.connectedUserInfo = null;
            log('>>> [WhatsApp] QR Processed successfully');
        } catch (err) {
            log('>>> [WhatsApp] QR Error:', err);
        }
    });

    newClient.on('ready', () => {
        log('>>> [WhatsApp] READY!');
        global.clientStatus = 'CONNECTED';
        global.qrCodeData = null;

        // Fetch user info
        if (newClient.info && newClient.info.wid) {
            global.connectedUserInfo = {
                name: newClient.info.pushname || 'WhatsApp User',
                phone: newClient.info.wid.user
            };
            log('>>> [WhatsApp] User Info fetched:', global.connectedUserInfo);
        }
    });

    newClient.on('authenticated', () => {
        log('>>> [WhatsApp] AUTHENTICATED');
        global.clientStatus = 'CONNECTED';
    });

    newClient.on('auth_failure', (msg) => {
        log('>>> [WhatsApp] AUTH_FAILURE:', msg);
        global.clientStatus = 'DISCONNECTED';
        global.connectedUserInfo = null;
    });

    newClient.on('disconnected', (reason) => {
        log('>>> [WhatsApp] DISCONNECTED:', reason);
        global.clientStatus = 'DISCONNECTED';
        global.whatsappClient = undefined; // Allow re-init
        global.connectedUserInfo = null;
    });

    // Add loading screen event which often helps debugging where it hangs
    newClient.on('loading_screen', (percent, message) => {
        log(`>>> [WhatsApp] LOADING: ${percent}% - ${message}`);
    });

    global.whatsappClient = newClient;
    global.clientStatus = 'DISCONNECTED';
    global.qrCodeData = null;
    global.connectedUserInfo = null;

    return newClient;
};

// Exported actions
export const initializeClient = async () => {
    try {
        const c = getClient();
        if (global.clientStatus === 'CONNECTED' || global.clientStatus === 'INITIALIZING') {
            log('>>> [WhatsApp] Client already running or initializing.');
            return;
        }

        log('>>> [WhatsApp] Starting Initialization...');
        global.clientStatus = 'INITIALIZING';
        await c.initialize();
        log('>>> [WhatsApp] Initialize called.');
    } catch (error: any) {
        log('>>> [WhatsApp] Init FAILED:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            ...error
        });
        global.clientStatus = 'DISCONNECTED';
        global.whatsappClient = undefined; // Reset to allow retry
    }
};

export const getClientStatus = () => {
    // Attempt to re-fetch info if connected but missing (e.g. after restart)
    if (global.whatsappClient && global.clientStatus === 'CONNECTED' && !global.connectedUserInfo) {
        if (global.whatsappClient.info && global.whatsappClient.info.wid) {
            global.connectedUserInfo = {
                name: global.whatsappClient.info.pushname || 'WhatsApp User',
                phone: global.whatsappClient.info.wid.user
            };
        }
    }

    return {
        status: global.clientStatus || 'DISCONNECTED',
        qrCode: global.qrCodeData,
        userInfo: global.connectedUserInfo
    };
};

export const logoutClient = async () => {
    if (global.whatsappClient) {
        try {
            log('>>> [WhatsApp] Logging out...');
            await global.whatsappClient.logout();
            log('>>> [WhatsApp] Logout success');
        } catch (e) { log('Logout error', e); }
        global.whatsappClient = undefined;
        global.clientStatus = 'DISCONNECTED';
        global.connectedUserInfo = null;
    }
};

export default getClient;

