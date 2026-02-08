import { NextResponse } from 'next/server';

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

/**
 * POST - Reload all WhatsApp accounts from database into the service (server-multi).
 * Call this after creating a new account so the service picks it up.
 */
export async function POST() {
    try {
        const response = await fetch(`${WHATSAPP_SERVICE_URL}/reload-accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (!data.success) {
            return NextResponse.json({ success: false, error: data.error }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: data.message });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'WhatsApp service unavailable' },
            { status: 503 }
        );
    }
}
