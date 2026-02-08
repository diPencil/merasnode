import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

/**
 * GET - Get WhatsApp status and QR for a specific account (server-multi).
 * Query: accountId (optional) - if provided, returns status for that account; otherwise first account from DB.
 */
export async function GET(req: NextRequest) {
    const accountId = req.nextUrl.searchParams.get('accountId');

    try {
        if (accountId) {
            // Per-account status from WhatsApp service (server-multi)
            const response = await fetch(`${WHATSAPP_SERVICE_URL}/status/${accountId}`);
            const data = await response.json();

            if (!data.success) {
                return NextResponse.json({
                    status: 'DISCONNECTED',
                    qrCode: null,
                    error: data.error || 'Account not found'
                });
            }

            let status: string = 'DISCONNECTED';
            if (data.isReady) status = 'CONNECTED';
            else if (data.qrCode) status = 'WAITING_FOR_SCAN';
            else if (data.status === 'INITIALIZING' || data.status === 'QR_GENERATED') status = data.status === 'QR_GENERATED' ? 'WAITING_FOR_SCAN' : 'INITIALIZING';

            return NextResponse.json({
                status,
                qrCode: data.qrCode || null,
                accountId: data.accountId,
                phone: data.phone
            });
        }

        // Backward compat: no accountId - use first account from DB and its live status
        const account = await prisma.whatsAppAccount.findFirst({
            orderBy: { createdAt: 'desc' }
        });
        if (!account) {
            return NextResponse.json({ status: 'DISCONNECTED', qrCode: null });
        }

        try {
            const statusRes = await fetch(`${WHATSAPP_SERVICE_URL}/status/${account.id}`);
            const statusData = await statusRes.json();
            if (statusData.success) {
                let status: string = 'DISCONNECTED';
                if (statusData.isReady) status = 'CONNECTED';
                else if (statusData.qrCode) status = 'WAITING_FOR_SCAN';
                else status = statusData.status === 'QR_GENERATED' ? 'WAITING_FOR_SCAN' : statusData.status || 'INITIALIZING';
                return NextResponse.json({
                    status,
                    qrCode: statusData.qrCode || null,
                    accountId: account.id
                });
            }
        } catch {
            // service down
        }
        return NextResponse.json({ status: 'DISCONNECTED', qrCode: null });
    } catch (error) {
        return NextResponse.json({ status: 'DISCONNECTED', qrCode: null, error: 'Service unavailable' });
    }
}

/**
 * POST - Initialize (or restart) a WhatsApp account (server-multi).
 * Body: { action: 'init', accountId: string, force?: boolean }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, force, accountId } = body;

        if (action === 'init') {
            if (!accountId) {
                return NextResponse.json(
                    { success: false, error: 'accountId is required for multi-account service' },
                    { status: 400 }
                );
            }
            const response = await fetch(`${WHATSAPP_SERVICE_URL}/initialize/${accountId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force: !!force })
            });
            const data = await response.json();
            if (!data.success) {
                return NextResponse.json({ success: false, error: data.error || 'Failed to initialize' }, { status: 400 });
            }
            return NextResponse.json({ success: true, message: data.message || 'Initialization started' });
        }

        if (action === 'logout') {
            return NextResponse.json({ success: true, message: 'Logged out' });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to call WhatsApp service' }, { status: 503 });
    }
}
