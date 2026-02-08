/**
 * verify-all.js - Full system verification: Next.js server, WhatsApp service, DB, optional send test.
 * Usage: node verify-all.js [--send]
 *   --send  Optional: try sending a test message if a connected account exists.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NEXT_APP_URL = process.env.NEXT_APP_URL || 'http://localhost:3000';
const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
const doSendTest = process.argv.includes('--send');

async function checkNextServer() {
  console.log('\n[1/4] Next.js server (app)...');
  try {
    const res = await fetch(NEXT_APP_URL, { method: 'GET' });
    if (res.ok) {
      console.log('  ✅ Next.js server is up at', NEXT_APP_URL);
      return true;
    }
    console.log('  ⚠️ Next.js returned status', res.status);
    return false;
  } catch (err) {
    console.log('  ❌ Next.js server unreachable:', err.message);
    return false;
  }
}

async function checkWhatsAppService() {
  console.log('\n[2/4] WhatsApp service...');
  try {
    const healthRes = await fetch(`${WHATSAPP_SERVICE_URL}/health`);
    const health = await healthRes.json();
    if (health.success && health.service) {
      console.log('  ✅ WhatsApp service is up at', WHATSAPP_SERVICE_URL);
      console.log('     Service:', health.service, '| Accounts in service:', health.totalAccounts || 0, '| Ready:', health.readyAccounts || 0);
    } else {
      console.log('  ⚠️ WhatsApp service responded but success=false');
    }

    const statusRes = await fetch(`${WHATSAPP_SERVICE_URL}/status`);
    const statusData = await statusRes.json();
    if (statusData.success && Array.isArray(statusData.accounts)) {
      statusData.accounts.forEach((acc) => {
        const ready = acc.isReady ? '✅' : '⏳';
        console.log(`     ${ready} ${acc.accountId}: ${acc.status || 'N/A'} ${acc.phone ? `(${acc.phone})` : ''}`);
      });
      return true;
    }
    return health.success;
  } catch (err) {
    console.log('  ❌ WhatsApp service unreachable:', err.message);
    return false;
  }
}

async function checkDatabase() {
  console.log('\n[3/4] Database...');
  try {
    const userCount = await prisma.user.count();
    const accountCount = await prisma.whatsAppAccount.count();
    const connectedCount = await prisma.whatsAppAccount.count({ where: { status: 'CONNECTED' } });
    console.log('  ✅ Database connected.');
    console.log('     Users:', userCount, '| WhatsApp accounts:', accountCount, '| Connected:', connectedCount);

    const recentMessages = await prisma.message.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' }
    });
    if (recentMessages.length > 0) {
      console.log('     Recent messages:', recentMessages.length);
    }
    return true;
  } catch (err) {
    console.log('  ❌ Database error:', err.message);
    return false;
  }
}

async function optionalSendTest() {
  console.log('\n[4/4] Send test (optional)...');
  const connected = await prisma.whatsAppAccount.findMany({
    where: { status: 'CONNECTED' },
    take: 1
  });
  if (connected.length === 0) {
    console.log('  ⏭️ No connected WhatsApp account; skipping send test.');
    return;
  }
  const account = connected[0];
  if (!doSendTest) {
    console.log('  ℹ️ Connected account available for sending:', account.phone, '(run with --send to test send)');
    return;
  }
  try {
    const testNumber = process.env.VERIFY_TEST_PHONE || account.phone;
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.id,
        phoneNumber: testNumber.replace(/\D/g, ''),
        message: `[MerasNode verify-all] Test at ${new Date().toISOString()}`
      })
    });
    const data = await res.json();
    if (data.success) {
      console.log('  ✅ Test message sent successfully.');
    } else {
      console.log('  ❌ Send failed:', data.error || 'Unknown');
    }
  } catch (err) {
    console.log('  ❌ Send test error:', err.message);
  }
}

async function main() {
  console.log('═══ MerasNode – Full verification ═══');

  const serverOk = await checkNextServer();
  const whatsappOk = await checkWhatsAppService();
  const dbOk = await checkDatabase();
  await optionalSendTest();

  console.log('\n--- Summary ---');
  if (serverOk && whatsappOk && dbOk) {
    console.log('✅ Server, WhatsApp service, and database are OK. You can link accounts and send/receive.');
  } else {
    const parts = [];
    if (!serverOk) parts.push('Next.js');
    if (!whatsappOk) parts.push('WhatsApp service');
    if (!dbOk) parts.push('Database');
    console.log('❌ Issues with:', parts.join(', '));
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
